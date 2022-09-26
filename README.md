# Project name

A web-based note taking app.

Contents
========

 * [Dependencies](#dependencies)
 * [Installation](#installation)
 * [Usage](#usage)
 * [Deployment](#deployment)
 * [Other](#other)
 * [License](#license)

# Dependencies

Node.js, MongoDB, as well as a few Node.js packages.

# Installation

1. Install [MongoDB](https://www.mongodb.com/try/download/community)
2. Install [Node.js & NPM](https://nodejs.org/en/download/)
3. Open the project in command-line
4. Install server and client dependencies using `npm install`
5. Start project in development mode using `npm run dev`

# Usage

Open your browser and go to https://localhost:3080.

The client and server are separate modules. Start each one individually by running `npm run start` in the respective directory.

Note: client requires building with `npm run build`.

# Deployment

## PM2

The app is deployed using [PM2](https://pm2.keymetrics.io/docs/usage/startup/) on an Amazon EC2 virtual machine. There are two processes: "client" and "server". Both processes start automatically after a reboot.

## Cheatsheet

Restart processes using
- `pm2 restart server`
- `pm2 restart client`
- `pm2 restart all`
- don't forget to rebuild the client if changed by running `npm run build` in client folder

Reset restart counters using
- `pm2 reset all`

Processes were created by running the following commands in the apropriate folders:
- `pm2 start "npm run start" --name server`
- `pm2 start "npm run start" --name client`

## Ports

The frontend is running on port 3080, not 80, due to permission issues.

Traffic is redirected from port 80 to 3080 with the following command:

`sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3080`

This command is scheduled to run at startup automatically using chromtab `crontab -e` command, read more about chrontab [here](https://askubuntu.com/questions/814/how-to-run-scripts-on-start-up).

# Other

See number of lines of code using `npm run line-count`.

# License

All right reserved.