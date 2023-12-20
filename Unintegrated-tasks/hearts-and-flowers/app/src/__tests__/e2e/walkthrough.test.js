/* eslint-disable no-await-in-loop */
import { test, expect } from '@playwright/test';
import { finalPageCheck, fsCheck, isDeviceMobile, getBreakIntervals, getTrialInfo } from './testHelperFunctions';

test(`SWR walkthrough in ${process.env.MODE} mode`, async ({ page, browserName }, workerInfo) => {
  const isMobile = isDeviceMobile(workerInfo);

  await page.goto(`/?mode=${process.env.MODE}`);

  if (process.env.MODE === 'demo') {
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('I agree to participate in this research.').check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    // await page.getByRole('button', { name: 'Continue' }).click();
  } else {
    await page.getByRole('button', { name: 'Continue' }).click();
  }

  if (isMobile) {
    await page.getByText(`Press HERE to continue`).click();
    await page.getByText(`Press HERE to continue`).click();
    await expect(page.getByText(`Press HERE to practice`)).toBeVisible();
    await page.getByText(`Press HERE to practice`).click({ force: true });
  } else {
    await page.getByText(`Press ANY KEY to continue`).press('ArrowRight');
    await page.getByText(`Press ANY KEY to continue`).press('ArrowRight');
    await page.getByText(`Press ANY KEY to practice`).press('ArrowRight');
  }

  if (browserName === 'chromium') await fsCheck(page);

  const [trialBlocks, trialNumberTotal] = await getTrialInfo(page);

  const breakIntervals = getBreakIntervals(trialBlocks);

  const practiceStims = [
    { word: 'xop', arrow: 'ArrowLeft' },
    { word: 'how', arrow: 'ArrowRight' },
    { word: 'after', arrow: 'ArrowRight' },
    { word: 'auler', arrow: 'ArrowLeft' },
    { word: 'hom', arrow: 'ArrowLeft' },
  ];

  for (const { word, arrow } of practiceStims) {
    if (isMobile) {
      await page.getByRole('button', { name: 'left arrow' }).click();
      await expect(page.getByText('You pressed the left arrow')).toBeVisible();
      await page.getByAltText('Arrow choices').click();
    } else {
      await page.getByText(word).press(arrow);
      await expect(page.getByText('You pressed the')).toBeVisible();
      await page.getByAltText('arrow keys').press(arrow);
    }
  }

  if (isMobile) {
    await page.getByText(`Press HERE to begin`).click({ force: true });
  } else {
    await page.getByText(`Press ANY KEY to begin`).press('ArrowLeft');
  }

  if (browserName === 'chromium') await fsCheck(page);

  // lexicality test
  for (let i = 0; i < trialNumberTotal; i += 1) {
    if (process.env.MODE !== 'demo') {
      if (breakIntervals.includes(i)) {
        if (isMobile) {
          await page.getByText(`Press HERE to continue`).click();
        } else {
          await page.getByText('Press ANY KEY to continue').press('ArrowLeft');
        }
        if (browserName === 'chromium') await fsCheck(page);
      }
    }

    await page.locator('#stimulus-word').textContent();

    if (isMobile) {
      await page.getByRole('button', { name: `${i % 2 === 0 ? 'left' : 'right'} arrow` }).click();
    } else {
      await page.getByAltText('arrow-key').press(`${i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight'}`);
    }

    if (process.env.MODE === 'demo') {
      if (breakIntervals.includes(i)) {
        if (isMobile) {
          await page.getByText(`Press HERE to continue`).click();
        } else {
          await page.getByText('Press ANY KEY to continue').press('ArrowLeft');
        }

        if (browserName === 'chromium') await fsCheck(page);
      }
    }
  }

  await finalPageCheck(page, process.env.MODE, isMobile);
});
