# Project name

A web-based note taking app.

Contents
========

 * [Dependencies](#dependencies)
 * [Installation](#installation)
 * [Usage](#usage)
 * [TO DO](#todo)
 * [License](#license)

# Dependencies

Node.js, MongoDB, as well as a few Node.js packages.

# Installation

1. Install [MongoDB](https://www.mongodb.com/try/download/community)
2. Install [Node.js & NPM](https://nodejs.org/en/download/)
3. Open the project in command-line
4. Install project dependencies using `npm install`
5. Start project using `npm run dev` on Windows

# Usage

Open your browser and go to https://localhost:3000.

# To-do list

### Landing page
* [X] Design
* [X] Code

### Account system
* [X] Basic registration endpoint
* [X] Basic login endpoint
* [ ] Add email verification
* [ ] Phone verification (SMS)

### Login/Register frontend
* [ ] Dropdown for country selection for phone number
* [X] Secure storage of JWT on the browser (localStorage is very bad)
* [X] Design login & registration components
* [ ] Design Logout component (login for logged user), Dont show login/register if already auth
* [ ] Design full login / auth page
* [ ] reCaptcha
* [ ] Validate fields in browser (+ visual feeback, eg password too short etc)
* [ ] Add user agreement checkbox
* [ ] Custom checkbox for user agreement

### Document exporer
* [X] Design
* [ ] Implement front-end
* [ ] Link with backend

### Drawing
* [X] Set up WebGL pipeline
* [X] Shader support for diferent colors, zoom levels, view position, view height
* [X] Zoom / scroll gesture
* [X] Zoom / scroll JS events
* [X] Scrolling inertia
* [X] Connect with backend
* [X] Eraser
* [X] Optimize WebGL buffers
* [X] Display scroll bar
* [X] Full screen button
* [X] Live collab
* [X] Interactive strollbars
* [X] Make work on Apple
* [X] Fix stroke width (thins out at the end)
* [ ] Split initial package
* [ ] Download notes as PNG
* [ ] Optimize physics engine & rewrite in WebAssembly (not necessary for now, rendering is the bottleneck)
* [ ] Pen prediction (very hard, requires neural nets), note: PointerEvent.getPredictedEvents() is absolute garbage

### Tech debt
* [ ] Send live collaboration update on scroll (not just on pointer move), so that pointer appears to move when scrolling
* [ ] Optimize live collaboration (send only stroke modification, not entire stroke every time)
* [ ] Careful about storing collaborators in memory in Server, probably better to use mongo when lots of users

# License

All right reserved.