# AKC Scraping

This repository is intended to scrape agility training competition data from the
[American Kennel Club](akc.org) website, and store that data in a
[MongoDB](https://www.mongodb.com/) database.

The repository is written in [TypeScript](https://www.typescriptlang.org/), and
runs on [Node.js](https://nodejs.org/).

## Development

### Prerequisites

1. Download Node (preferably v14.18.2)
1. Have the Meteor server running in the background

### Compiling

1. Run `npm run compile`, which will transpile the TypeScript code into
   JavaScript.
1. Set the environment variable `MONGODB_URI` to the address of your MongoDB
   instance (e.g. `"mongodb://localhost:27017"`). Without this step, the scraper
   cannot connect to the database.
1. Once compiled, run `node build/src/main.js`, and the scraper will begin
   working!
