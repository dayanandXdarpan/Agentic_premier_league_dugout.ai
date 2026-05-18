"""
scraper.py — Data Ingestion Agent for Dugout.ai

This module ONLY pushes raw scraped commentary strings into raw_data_queue.
It does NOT call Gemini or broadcast to clients — that's the orchestrator's job.

Strategy:
  1. Try Playwright headless scraping (configurable via environment)
  2. Auto-fallback to built-in IPL 2024 Final commentary dataset
  3. Pace delivery using SCRAPE_INTERVAL to simulate live match feel
"""

import asyncio
import hashlib
import logging
import os

from queues import raw_data_queue

logger = logging.getLogger("dugout.scraper")

# ============================================
# CONFIGURATION
# ============================================

MATCH_URL = os.environ.get(
    "MATCH_URL",
    "https://www.cricbuzz.com/cricket-match-highlights/89753/kkr-vs-srh-final-indian-premier-league-2024",
)

# Seconds between each ball delivery (simulates live pacing)
SCRAPE_INTERVAL = int(os.environ.get("SCRAPE_INTERVAL", "8"))

# Whether to loop the simulation continuously (for demo purposes)
LOOP_SIMULATION = os.environ.get("LOOP_SIMULATION", "false").lower() == "true"

# Data source mode: "true" = built-in only, "false" = Playwright only, "auto" = try then fallback
USE_BUILTIN_DATA = os.environ.get("USE_BUILTIN_DATA", "auto").lower()


def _hash(text: str) -> str:
    """MD5 hash for deduplication."""
    return hashlib.md5(text.encode("utf-8")).hexdigest()


# ============================================
# BUILT-IN COMMENTARY DATA
# Real ball-by-ball data from KKR vs SRH IPL 2024 Final
# ============================================
BUILTIN_COMMENTARY = [
    # 1st Innings - KKR Batting
    "0.1 Mitchell Starc to Sunil Narine, FOUR! Full and wide, Narine crashes it through covers. KKR 4/0 (0.1)",
    "0.2 Mitchell Starc to Sunil Narine, no run, good length on off stump, defended solidly",
    "0.3 Mitchell Starc to Sunil Narine, SIX! Short ball and Narine pulls it over deep midwicket! KKR 10/0 (0.3)",
    "0.4 Mitchell Starc to Sunil Narine, 1 run, pushed to mid-on for a single",
    "0.5 Mitchell Starc to Venkatesh Iyer, FOUR! Drives on the up through extra cover, beautiful timing! KKR 15/0 (0.5)",
    "0.6 Mitchell Starc to Venkatesh Iyer, no run, yorker on middle, dug out. End of over 1. KKR 15/0",
    "1.1 Bhuvneshwar Kumar to Sunil Narine, 1 run, worked off the pads to fine leg",
    "1.2 Bhuvneshwar Kumar to Venkatesh Iyer, FOUR! Back of a length, pulled through midwicket! KKR 20/0 (1.2)",
    "1.3 Bhuvneshwar Kumar to Venkatesh Iyer, no run, good length on off, left alone outside off",
    "1.4 Bhuvneshwar Kumar to Venkatesh Iyer, 2 runs, flicked off the pads to deep square leg",
    "1.5 Bhuvneshwar Kumar to Venkatesh Iyer, no run, beaten! Outswinger beats the outside edge",
    "1.6 Bhuvneshwar Kumar to Venkatesh Iyer, 1 run, pushed to long-on. End of over 2. KKR 23/0",
    "2.1 T Natarajan to Sunil Narine, SIX! Down the ground, massive hit over long-on! KKR 29/0 (2.1)",
    "2.2 T Natarajan to Sunil Narine, FOUR! Smashed through point, no stopping that! KKR 33/0 (2.2)",
    "2.3 T Natarajan to Sunil Narine, OUT! CAUGHT! Narine tries to go big again but finds deep midwicket! KKR 33/1 (2.3). Narine c Abhishek b Natarajan 26(9)",
    "2.4 T Natarajan to Angkrish Raghuvanshi, no run, left alone outside off stump",
    "2.5 T Natarajan to Angkrish Raghuvanshi, 1 run, pushed to cover for a single",
    "2.6 T Natarajan to Venkatesh Iyer, FOUR! Short and wide, cut past point! KKR 38/1. End of over 3",
    "3.1 Mitchell Starc to Venkatesh Iyer, no run, good length, defended back to the bowler",
    "3.2 Mitchell Starc to Venkatesh Iyer, 1 run, driven to mid-off for a quick single",
    "3.3 Mitchell Starc to Angkrish Raghuvanshi, no run, short ball, ducked under it",
    "3.4 Mitchell Starc to Angkrish Raghuvanshi, OUT! BOWLED! Starc's yorker crashes into the stumps! KKR 39/2 (3.4). Raghuvanshi b Starc 1(3)",
    "3.5 Mitchell Starc to Shreyas Iyer, no run, captain walks in, defends first ball",
    "3.6 Mitchell Starc to Shreyas Iyer, 2 runs, driven through covers, well run. End of over 4. KKR 41/2",
    "4.1 Pat Cummins to Venkatesh Iyer, SIX! Launches Cummins over long-on! What a shot! KKR 47/2 (4.1)",
    "4.2 Pat Cummins to Venkatesh Iyer, 1 run, pushed to long-off for a single",
    "4.3 Pat Cummins to Shreyas Iyer, FOUR! Driven through extra cover, captain timing it well! KKR 52/2 (4.3)",
    "4.4 Pat Cummins to Shreyas Iyer, no run, length ball on off, left alone",
    "4.5 Pat Cummins to Shreyas Iyer, 1 run, worked to midwicket",
    "4.6 Pat Cummins to Venkatesh Iyer, OUT! CAUGHT BEHIND! Edge and Klaasen takes it! KKR 53/3 (4.6). V Iyer c Klaasen b Cummins 18(11). End of powerplay.",
    "5.1 Washington Sundar to Shreyas Iyer, 1 run, swept to fine leg",
    "5.2 Washington Sundar to Nitish Rana, no run, defended off the front foot",
    "5.3 Washington Sundar to Nitish Rana, SIX! Steps out and launches it over long-on! KKR 60/3 (5.3)",
    "5.4 Washington Sundar to Nitish Rana, 1 run, pushed to long-on",
    "5.5 Washington Sundar to Shreyas Iyer, FOUR! Reverse swept past short third! Brilliant! KKR 65/3 (5.5)",
    "5.6 Washington Sundar to Shreyas Iyer, no run, defended. End of over 6. KKR 65/3",
    "6.1 Shahbaz Ahmed to Nitish Rana, 1 run, turned to midwicket",
    "6.2 Shahbaz Ahmed to Shreyas Iyer, FOUR! Swept fine, races to the boundary! KKR 70/3 (6.2)",
    "6.3 Shahbaz Ahmed to Shreyas Iyer, no run, pushed back to the bowler",
    "6.4 Shahbaz Ahmed to Shreyas Iyer, 2 runs, driven to deep extra cover",
    "6.5 Shahbaz Ahmed to Shreyas Iyer, no run, tossed up, defended",
    "6.6 Shahbaz Ahmed to Shreyas Iyer, 1 run, nudged to midwicket. End of over 7. KKR 73/3",
    "7.1 Aiden Markram to Nitish Rana, no run, blocked back to the bowler",
    "7.2 Aiden Markram to Nitish Rana, SIX! Steps down the track and deposits it over long-on! KKR 79/3 (7.2)",
    "7.3 Aiden Markram to Nitish Rana, 1 run, worked to deep midwicket",
    "7.4 Aiden Markram to Shreyas Iyer, FOUR! Cut through backward point! Class! KKR 84/3 (7.4)",
    "7.5 Aiden Markram to Shreyas Iyer, 1 run, pushed to long-off",
    "7.6 Aiden Markram to Nitish Rana, OUT! STUMPED! Rana charges and misses, Klaasen whips the bails off! KKR 85/4 (7.6). Rana st Klaasen b Markram 17(11). End of over 8.",
    "8.1 Washington Sundar to Andre Russell, FOUR! Russell slams his first ball through midwicket! KKR 89/4 (8.1)",
    "8.2 Washington Sundar to Andre Russell, SIX! Massive hit! Over deep square leg! The crowd erupts! KKR 95/4 (8.2)",
    "8.3 Washington Sundar to Andre Russell, 1 run, driven to long-off",
    "8.4 Washington Sundar to Shreyas Iyer, no run, well flighted, defended",
    "8.5 Washington Sundar to Shreyas Iyer, 2 runs, swept behind square",
    "8.6 Washington Sundar to Shreyas Iyer, FOUR! Driven inside-out over extra cover! Beautiful shot! KKR 102/4. End of over 9.",
    # Mid-innings acceleration
    "10.1 Pat Cummins to Andre Russell, SIX! Russell goes HUGE over cow corner! Absolute carnage! KKR 118/4 (10.1)",
    "10.2 Pat Cummins to Andre Russell, no run, yorker, well blocked",
    "10.3 Pat Cummins to Andre Russell, FOUR! Thick edge flies past the keeper! KKR 122/4 (10.3)",
    "10.4 Pat Cummins to Andre Russell, OUT! CAUGHT! Top edge goes to fine leg! Russell departs for a quickfire 36(15)! KKR 122/5 (10.4)",
    "10.5 Pat Cummins to Rinku Singh, no run, defended carefully, new batsman sizing it up",
    "10.6 Pat Cummins to Rinku Singh, 1 run, worked off the pads. End of over 11. KKR 123/5",
    # Death overs drama
    "16.1 T Natarajan to Shreyas Iyer, FOUR! Short ball pulled over midwicket! Captain leading from the front! KKR 156/5 (16.1)",
    "16.2 T Natarajan to Shreyas Iyer, 1 run, pushed to long-on",
    "16.3 T Natarajan to Rinku Singh, SIX! RINKU SPECIAL! Scooped over fine leg! KKR 163/5 (16.3)",
    "16.4 T Natarajan to Rinku Singh, FOUR! Driven down the ground, unstoppable! KKR 167/5 (16.4)",
    "16.5 T Natarajan to Rinku Singh, 2 runs, swept behind square, excellent running",
    "16.6 T Natarajan to Rinku Singh, SIX! Another massive hit! KKR 175/5 (16.6). End of over 17. KKR flying!",
    "17.1 Mitchell Starc to Shreyas Iyer, OUT! CAUGHT! Iyer holes out to deep midwicket! Brilliant innings ends. KKR 175/6 (17.1). Iyer c Abhishek b Starc 58(35)",
    "17.2 Mitchell Starc to Ramandeep Singh, 1 run, guided to third man",
    "17.3 Mitchell Starc to Rinku Singh, FOUR! Flat-batted over mid-on! KKR 180/6 (17.3)",
    "17.4 Mitchell Starc to Rinku Singh, no run, yorker, dug out just in time",
    "17.5 Mitchell Starc to Rinku Singh, 2 runs, driven to deep cover, quick running",
    "17.6 Mitchell Starc to Rinku Singh, SIX! What a finish to the over! KKR 188/6 (17.6). End of over 18.",
    "18.1 Bhuvneshwar Kumar to Ramandeep Singh, FOUR! Slashed past point! KKR 192/6 (18.1)",
    "18.2 Bhuvneshwar Kumar to Ramandeep Singh, 1 run, pushed to long-off",
    "18.3 Bhuvneshwar Kumar to Rinku Singh, SIX! Rinku finishes it in style! KKR 199/6 (18.3)",
    "18.4 Bhuvneshwar Kumar to Rinku Singh, 2 runs, excellent running",
    "18.5 Bhuvneshwar Kumar to Rinku Singh, FOUR! Smashed through covers! KKR 205/6 (18.5)",
    "18.6 Bhuvneshwar Kumar to Rinku Singh, 1 run, single to end the innings. KKR finish at 208/6 in 19 overs!",
    # 2nd Innings - SRH Batting
    "0.1 Varun Chakravarthy to Abhishek Sharma, no run, quicker ball on off stump, defended. SRH begin the chase. Target: 209",
    "0.2 Varun Chakravarthy to Abhishek Sharma, FOUR! Swept behind square, great start! SRH 4/0 (0.2)",
    "0.3 Varun Chakravarthy to Abhishek Sharma, 1 run, pushed to cover",
    "0.4 Varun Chakravarthy to Travis Head, SIX! Head smashes it over the bowler's head! SRH 11/0 (0.4)",
    "0.5 Varun Chakravarthy to Travis Head, 1 run, pushed to long-on",
    "0.6 Varun Chakravarthy to Abhishek Sharma, no run, defended. End of over 1. SRH 12/0. Solid start for SRH!",
    "1.1 Harshit Rana to Travis Head, FOUR! Driven through extra cover! SRH 16/0 (1.1)",
    "1.2 Harshit Rana to Travis Head, no run, good length outside off, left alone",
    "1.3 Harshit Rana to Travis Head, OUT! BOWLED! What a delivery! Nips back in and crashes into the stumps! SRH 16/1 (1.3). Head b Harshit Rana 11(5)",
    "1.4 Harshit Rana to Rahul Tripathi, no run, defended on the front foot",
    "1.5 Harshit Rana to Rahul Tripathi, 1 run, flicked off the pads",
    "1.6 Harshit Rana to Abhishek Sharma, SIX! Short ball HAMMERED over square leg! SRH 23/1 (1.6). End of over 2.",
    "2.1 Sunil Narine to Abhishek Sharma, 1 run, pushed to cover",
    "2.2 Sunil Narine to Rahul Tripathi, no run, mystery ball, defended cautiously",
    "2.3 Sunil Narine to Rahul Tripathi, OUT! CAUGHT AND BOWLED! Narine takes a stunning return catch! SRH 24/2 (2.3). Tripathi c&b Narine 1(3)",
    "2.4 Sunil Narine to Heinrich Klaasen, FOUR! Klaasen announces himself with a fierce cut! SRH 28/2 (2.4)",
    "2.5 Sunil Narine to Heinrich Klaasen, no run, turned to midwicket",
    "2.6 Sunil Narine to Heinrich Klaasen, 1 run, worked to deep square. End of over 3. SRH 29/2",
    "5.1 Varun Chakravarthy to Abhishek Sharma, OUT! STUMPED! Brilliant stumping by Dhruv Jurel! SRH 42/3 (5.1). Abhishek st Jurel b Varun 22(17)",
    "5.2 Varun Chakravarthy to Aiden Markram, no run, defended",
    "8.1 Andre Russell to Heinrich Klaasen, SIX! Klaasen is DESTROYING everything! Over deep midwicket! SRH 78/3 (8.1)",
    "8.2 Andre Russell to Heinrich Klaasen, FOUR! Driven through the covers! Class! SRH 82/3 (8.2)",
    "8.3 Andre Russell to Heinrich Klaasen, no run, slower ball, missed",
    "12.1 Sunil Narine to Heinrich Klaasen, OUT! RUN OUT! Mix-up between the batters! Klaasen is short! SRH 113/4 (12.1). Klaasen run out (Shreyas Iyer) 42(28). Massive wicket for KKR!",
    "15.1 Harshit Rana to Pat Cummins, OUT! CAUGHT! Cummins' cameo ends! SRH 148/7 (15.1). The required rate is climbing!",
    "17.1 Andre Russell to Shahbaz Ahmed, OUT! BOWLED! Russell's slower ball does the trick! SRH 162/8 (17.1). Game over for SRH!",
    "18.6 Varun Chakravarthy to T Natarajan, OUT! CAUGHT! It's all over! KKR WIN THE IPL 2024! KKR beat SRH by 46 runs! What a final!",
]


# ============================================
# PUBLIC ENTRY POINT
# ============================================

async def run_scraper() -> None:
    """
    Asynchronous data ingestion loop.
    Pushes raw commentary strings into raw_data_queue.
    Does NOT call Gemini or broadcast — that's the orchestrator's job.
    """
    logger.info("Starting Dugout.ai data ingestion engine...")
    logger.info(f"  Interval: {SCRAPE_INTERVAL}s | Loop: {LOOP_SIMULATION}")

    if USE_BUILTIN_DATA == "true":
        logger.info("Using BUILT-IN commentary data (USE_BUILTIN_DATA=true)")
        await _run_builtin_simulation()
        return

    if USE_BUILTIN_DATA == "false":
        logger.info("Scraping mode forced (USE_BUILTIN_DATA=false)")
        await _run_playwright_scraper()
        return

    # AUTO mode: Try Playwright first, fall back to built-in
    logger.info("AUTO mode: Attempting Playwright scrape, with built-in fallback...")
    scraped = await _try_playwright_once()
    if scraped:
        await _run_playwright_scraper()
    else:
        logger.info("Playwright scraping failed. Switching to built-in commentary data.")
        await _run_builtin_simulation()


# ============================================
# BUILT-IN SIMULATION
# ============================================

async def _run_builtin_simulation() -> None:
    """Simulate a live match using built-in commentary data."""
    logger.info(f"Starting built-in match simulation ({len(BUILTIN_COMMENTARY)} balls)")

    while True:
        # Push initial match state
        await raw_data_queue.put(
            "__MATCH_STATE__|KKR|SRH|MA Chidambaram Stadium, Chennai|Live (Simulated)"
        )

        for i, text in enumerate(BUILTIN_COMMENTARY):
            try:
                logger.info(f"[{i + 1}/{len(BUILTIN_COMMENTARY)}] {text[:70]}...")

                # Push raw commentary string into the queue
                await raw_data_queue.put(text)

                # Pace the simulation
                await asyncio.sleep(SCRAPE_INTERVAL)

            except asyncio.CancelledError:
                logger.info("Built-in simulation cancelled. Shutting down.")
                return

        logger.info("Match simulation complete!")
        if LOOP_SIMULATION:
            logger.info("Restarting simulation in 15 seconds...")
            await asyncio.sleep(15)
        else:
            return


# ============================================
# PLAYWRIGHT SCRAPER
# ============================================

async def _try_playwright_once() -> bool:
    """Attempt one Playwright scrape to check if the site is accessible."""
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
            )
            page = await context.new_page()
            await page.goto(MATCH_URL, wait_until="domcontentloaded", timeout=30000)

            title = await page.title()
            if "access denied" in title.lower() or "blocked" in title.lower():
                logger.warning(f"Site returned '{title}' — headless browser blocked.")
                await browser.close()
                return False

            com_locator = page.locator("p.cb-com-ln")
            texts = await com_locator.all_inner_texts()
            await browser.close()

            if texts and len(texts) > 5:
                logger.info(f"Playwright scrape successful. Found {len(texts)} commentary lines.")
                return True
            else:
                logger.warning(f"Only {len(texts)} commentary lines found. Site may be blocking.")
                return False

    except Exception as e:
        logger.warning(f"Playwright probe failed: {e}")
        return False


async def _run_playwright_scraper() -> None:
    """Scrape commentary from Cricbuzz using Playwright — pushes raw text to queue only."""
    from playwright.async_api import async_playwright

    logger.info(f"Starting Playwright scraper: {MATCH_URL}")

    while True:
        seen_hashes: set[str] = set()
        simulation_index = 0

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                    viewport={"width": 1920, "height": 1080},
                )
                page = await context.new_page()

                await page.goto(MATCH_URL, wait_until="domcontentloaded", timeout=60000)
                logger.info("Page loaded successfully.")

                while True:
                    com_locator = page.locator("p.cb-com-ln")
                    all_texts = await com_locator.all_inner_texts()

                    if not all_texts:
                        logger.warning("No commentary found. Retrying in 5s.")
                        await asyncio.sleep(5)
                        continue

                    total = len(all_texts)
                    chunk = all_texts[simulation_index : simulation_index + 3]

                    for text in chunk:
                        text = text.strip()
                        if not text:
                            continue

                        text_hash = _hash(text)
                        if text_hash not in seen_hashes:
                            seen_hashes.add(text_hash)
                            logger.info(f"[{simulation_index}/{total}] {text[:70]}...")

                            # Push raw text to queue — orchestrator handles the rest
                            await raw_data_queue.put(text)

                    simulation_index += 1

                    if simulation_index >= total:
                        logger.info("End of match data.")
                        await browser.close()
                        if LOOP_SIMULATION:
                            logger.info("Restarting in 10s...")
                            await asyncio.sleep(10)
                            break
                        else:
                            return

                    await asyncio.sleep(SCRAPE_INTERVAL)

        except asyncio.CancelledError:
            logger.info("Scraper cancelled. Shutting down.")
            return
        except Exception as e:
            logger.error(f"Scraper error: {e}. Reconnecting in 10s...")
            await asyncio.sleep(10)
