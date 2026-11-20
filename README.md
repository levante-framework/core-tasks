# core-tasks

This repository contains jsPsych code for the LEVANTE core tasks, including cognitive measures for children, a child survey, and an adult reasoning task. You can [read more about the tasks and their development in our researcher documentation](https://researcher.levante-network.org/measures).

LEVANTE tasks are intended to be freely available to researchers across the world in a variety of languages to support scientific discovery related to child development and learning. LEVANTE core tasks (including code, corpus files, and assets) are [licensed CC-BY-NC-4.0](LICENSE.md) for non-commercial use with attribution.

The code base does not include item banks required to run a task. Each registered variant that runs through our dashboard points at a corpus CSV and loads parameters from a variant document. Valid parameters, and their behaviour, are specified in the code. The corpus files currently registered on prod, with links, are in [docs/live-corpora.md](docs/live-corpora.md). See [docs/corpus-columns.md](docs/corpus-columns.md) for information on columns contained in corpus files.

## Running Locally

For local testing during development:

First, you need to have node.js and npm installed.

```shell
# the task-launcher directory contains the task apps
cd task-launcher

# install dependencies
npm install

# run the development server
npm run dev
```

You can run tasks locally by using the task slug at the end of the url, e.g. math `http://localhost:8080/?task=egma-math`. Other parameters can also be included in the URL, e.g., age.

For details on task ongoing development and live demo links, see the [Direct Child Measures](https://researcher.levante-network.org/measures/direct-child-measures) page in our researcher documentation. Note that word reading, sentence reading, and language sounds from [ROAR (Rapid Online Assessment of Reading)](https://roar.education/) are not contained in this repository.

NOTE:
“This project is tested with BrowserStack.”