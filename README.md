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
* [ ] Set up API
* [ ] Design login & registration pages
* [ ] Code pages
* [ ] Login/register page

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
* [ ] Interactive strollbars
* [ ] Make work on Apple
* [ ] Split initial package
* [ ] Download notes as PNG
* [ ] Optimize physics engine & rewrite in WebAssembly (not necessary for now, rendering is the bottleneck)
* [ ] Pen prediction (very hard, requires neural nets)e

### Tech debt
* [ ] Send live collaboration update on scroll (not just on pointer move), so that pointer appears to move when scrolling
* [ ] Optimize live collaboration (send only stroke modification, not entire stroke every time)

# License

All right reserved.