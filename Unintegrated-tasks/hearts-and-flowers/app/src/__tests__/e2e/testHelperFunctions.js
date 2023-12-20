import { expect } from '@playwright/test';

export const modes = {
  // fullAdaptive: {
  //     currentBlockIndex: '2',
  //     trialNumTotal: "245",
  //     url: "/?mode=fullAdaptive"
  // },
  // fullRandom: {
  //     currentBlockIndex: '2',
  //     trialNumTotal: "245",
  //     url: "/?mode=fullRandom"
  // },
  shortAdaptive: {
    currentBlockIndex: '2',
    trialNumTotal: '100',
    url: '/?mode=shortAdaptive',
  },
  // longAdaptive: {
  //     currentBlockIndex: "2",
  //     trialNumTotal: "175",
  //     url: "/?mode=longAdaptive"
  // },
  // fullItemBank: {
  //     currentBlockIndex: "2",
  //     trialNumTotal: "271",
  //     url: "/?mode=fullItemBank"
  // },
  demo: {
    currentBlockIndex: '0',
    trialNumTotal: '84',
    url: '/?mode=demo',
  },
  // testAdaptive: {
  //     currentBlockIndex: "2",
  //     trialNumTotal: "14",
  //     url: "/?mode=testAdaptive"
  // },
  // testRandom: {
  //     currentBlockIndex: "2",
  //     trialNumTotal: "14",
  //     url: "/?mode=testRandom"
  // },
};

export const getTrialInfo = async (page) => {
  const sessionStorage = await page.evaluate(() => sessionStorage);
  const trialBlocksFromStorage = sessionStorage.numberOfTrials;

  const trialBlocks = trialBlocksFromStorage.split(',').map(Number);

  const trialNumberTotal = trialBlocks.reduce((prev, curr) => prev + curr);

  return [trialBlocks, trialNumberTotal];
};

export const getBreakIntervals = (trialBlocks) => {
  const intervals = [];

  trialBlocks.forEach((block, i) => {
    if (trialBlocks.length === 1) {
      intervals.push(Math.floor(block / 2));
      return;
    }

    const int1 = Math.floor(block / 2) + 1;
    const int2 = block - 1 - Math.floor(block / 2);

    if (i === trialBlocks.length - 1) {
      // only push first int
      intervals.push(intervals[intervals.length - 1] + int1);
      return;
    }

    if (!intervals.length) {
      intervals.push(int1);
    } else {
      intervals.push(intervals[intervals.length - 1] + int1);
    }

    intervals.push(intervals[intervals.length - 1] + int2);
  });

  return intervals;
};

// Check that test reached the final game break page
export const finalPageCheck = async (page, mode, isMobile) => {
  const gateImg = page.getByRole('img', { name: 'gate', exact: true });
  await expect(gateImg).toBeVisible();

  if (isMobile) {
    await expect(page.getByText('Press HERE to save your work')).toBeVisible();
  } else {
    await expect(page.getByText('Press ANY KEY to save your work')).toBeVisible();
  }

  const sessionStorage = await page.evaluate(() => sessionStorage);

  expect(sessionStorage.currentBlockIndex).toEqual(modes[mode].currentBlockIndex);
  expect(sessionStorage.trialNumTotal).toEqual(modes[mode].trialNumTotal);
};

// enable full screen
export const fsCheck = async (page) => {
  const continueBtn = page.getByRole('button', { name: 'Continue' });

  if (continueBtn) {
    await continueBtn.click();
  }
};

export const isDeviceMobile = (workerInfo) => workerInfo.project.name.includes('Mobile');
