# AKC Scraping

This repository is intended to scrape agility training competition data from the
[American Kennel Club](akc.org) website, and store that data in a
[MongoDB](https://www.mongodb.com/) database.

The repository is written in [TypeScript](https://www.typescriptlang.org/), and runs on [Deno](https://deno.land/),
a modern runtime for JavaScript/TypeScript with an emphasis on security. The
source code compiles to a single, self-contained, executable file.

The use of [Docker Compose](https://docs.docker.com/compose/) is for testing
purposes only.

## Development

### Prerequisites

1. Download [Deno](https://deno.land)
1. Have a MongoDB instance running, either in a container (achieved by
   installing Docker Compose and running `docker-compose.yml`), or running the
   database on your host machine.

### Compiling

1. Run
   `deno compile --allow-net --allow-write --allow-env -o scraper src/main.ts`
   1. This will compile the source code with permission to:
      1. access the internet
      1. write files to the local device
      1. access environment variables(
1. Set the environment variable `MONGODB_URI` to the address of your MongoDB
   instance (e.g. `"mongodb://localhost:27017"`). Without this step, the scraper
   cannot connect to the database.
1. Once compiled, the executable will be named `scraper`. Just execute
   `./scraper` to run the system.
