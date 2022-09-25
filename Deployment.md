## PM2

The app is deployed using [PM2](https://pm2.keymetrics.io/docs/usage/startup/). There are two processes: "frontend" and "backend". Both processes are set to start after a reboot.

## Cheatsheet

Restart processes using
- `pm2 restart server`
- `pm2 restart client`
- `pm2 restart all`
- don't forget to rebuild the client if changed (`npm run build` in client folder)

Reset restart counters using
- `pm2 reset all`

Processes were created by running the following commands in the apropriate folders:
- `pm2 start "npm run start" --name server`
- `pm2 start "npm run start" --name client`

## Ports

The frontend is running on port 3080, not 80. (permission issues)

Traffic is redirected from port 80 to 3080 with the following command:

`sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3080`

This command runs at startup automatically using chromtab: `crontab -e`

Read more about chrontab [here](https://askubuntu.com/questions/814/how-to-run-scripts-on-start-up).