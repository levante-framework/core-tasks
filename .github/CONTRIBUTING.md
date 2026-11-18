# About LEVANTE core-tasks

Welcome to the LEVANTE Core Tasks repository! The LEVANTE project is a scientific tool to collect behavioral and cognitive data from children, their caregivers, and their teachers. The tool is designed to be flexibly used in a variety of recruitment contexts, and applicable to many different scientific aims. The `core-tasks` repo contains front-end jsPsych code for LEVANTE measures.

# Contributing
LEVANTE is an open-source project, both in terms of our code-base and releases of scientific data. Contributing to open-source projects is a fantastic way to advance one's coding skills. However, the tool is constantly evolving and there isn't always an easy way to jump in and contribute. When we have issues that might be good to pick up as an outside contributor, these will have the label `good first issue`. If we don't have any unassigned issues in the `Ready to Start` column with this label, there might not be any tasks suitable for one-off contributors at the moment. You are still welcome to open a PR, but it may take awhile for us to get to it.

## Guidelines

When we have issues labeled `good first issue` open and ready to go, here are our guidelines:

- Wherever possible, avoid creating new moving parts where one might already exist. Look around the repo for reusable parts before building new ones.
- Automated testing is great, but it has its limits - make sure to look at and interact with things during testing.
- If you require assets for testing, our buckets are public and these should be accessible for asset reads. Corpus CSVs currently registered on prod are listed in [live-corpora.md](../docs/live-corpora.md). If you want to contribute code changes that rely on asset changes or additions, specify this clearly in your PR and let us know where we can find the assets so we can transfer these to our buckets.
- Test locally as thoroughly as you can before pushing your PR - note that this may involve testing with children of multiple ages, as well as testing different variant parameter values. Where possible, test on different kinds of devices (or emulators of those devices) - many of our users are on tablets (especially android tablets).
- When opening a PR, use the Development settings to link this to the issue the PR is meant to address. If you want to suggest changes not tied to an open issue, open an issue first so we know what the aims of the code changes are.
- Your PR should provide sufficiently detailed information for a reviewer to evaluate your specific task changes in our live environment. Your PR should specify which task(s) are affected and how to test them (e.g., what age conditions or other parameters).
- Note that **new languages/locales for a task are NOT managed within this repo**, and cannot be added using a PR. Our tasks are [internationalized through a detailed process](https://researcher.levante-network.org/internationalization) that generates and tests assets outside of the repository in order to keep launching new languages independent from code releases. 
