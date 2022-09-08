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

Open your browser and go to https://localhost:3080.

# To-do list

* [X] understand architecture (collaboration perspective):
	Main -> ToolManager -> MyTool -> Emitter -> ... -> TheirTool -> CanvasManager
	* [X] Create class diagram
  * [ ] Split Base Canvas Manager into GL & GraphicsContainer
  * How to keep active & static strokes layered?
  * How to optimize GL calls?
* [ ] use pointer capture in scrollbar
* [ ] selection/paste undo
* [ ] highlighter selection highlight --> too light
* [ ] geometry polyline overlap not accounting for radius --> hilighter might not get selected
* [ ] analytics

### Refactorings
* [X] Drawable -> Graphic + PersistentGraphic
* [X] GL Context to it's on class (instance stored in BaseCanvasManager)
* [X] Network tools: 2 versions (local and collab, with seamless communication)
* [X] Method-less Vector class (move all methods to static class)
* [-] Network singleton

### Bugs


### Landing page
* [X] Design
* [X] Code
* [ ] Text animation (can use [this](http://vara.akzhy.com/))

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
* [ ] Register / Login on "Enter" press

### Document exporer
* [X] Design
* [X] Implement front-end
* [X] Link with backend
* [X] File browsing
* [X] File creation

Must have:
* [X] Redirect to /auth if not logged in - 10m
* [ ] Document rights / priveleges - 1h
* [ ] File menu (to edit rename/delete/share) - 3h
    - hover over a file with the pen and 3 dots appear in to top right corner
    - or long press with finger (might interfere with drag an drop, postpone until after that is implemnted)
* [ ] Moving files to subfolter - 2h
    - drag & drop directly (like the mouse in desktop OS)
* [ ] File sharing (private access rights) - 4h
* [ ] File searching (search the entire thing, don't bother with searching in folder for now) - 1h
* [ ] Trash (deleteig files shold move them to this folder) - 1h
* [ ] Shared with me tab (see all notes shared with me) - 2h
Nice to have:
* [ ] Quick access folders / bookmarks (add left menu shortcuts to any folder)
    - long press to open menu with remove option
    - drag & drop to reorder
* [ ] Recent notes tab
* [ ] Note thumbnails

### User settings
* [ ] Settings popup - 1h
* [ ] Frontend UI - 1h
  - First, last name
  - Change password (send email that contains link to reset password)
* [ ] Connect with backend
  * [ ] API to change first & last name - 3h
  * [ ] API to send password reset email - 10h
    * [ ] Set up SMTP server
    * [ ] Tokens database
    * [ ] Add forgot password to auth menu

### User profile page

### Left ide menu
* [ ] Left menu
* [ ] Note name & ID
* [ ] Note public access
* [ ] Note private access
* [ ] Enable lecture mode (for professors)
* [ ] Connect to lecture (for students)

### Lecture mode
* [ ] Option to create "Lecture notes" from note creation menu (only for professors) - 1h
When student opens lecture notes:
* [ ] Speed selector - 3h
* [ ] Question selector + cancel button (questions are rectangles!) - 8h
* [ ] Copy selector - 3h
* [ ] Follow professor button (similar to Google Maps navication) - 3h
When student opens student notes:
* [ ] Ability to connect to professor notes from left menu - 1h
* [ ] Picture-in-picture of professor's notes - 5h
* [ ] Ability to maximize professor notes - 5h
When professor opens lecture notes:
* [ ] Speed indicator - 5h
* [ ] Highlight selected questions (gradient from 2 students ... MAX students on one question) - 8h


### Help


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
* [X] Fix widths wheel bug on Samsung
* [X] iOS bug
* [X] New strokes algorithm
  * [X] TRIANGLE_STRIP - 1h
  * [-] Strokes grouped in buffers by Y-coordinate to optimize rendering - 2h (UNFEASABLE)
  * [X] Highlighter strokes at the back => 2 sets of buffers: pen & highlighter - 1h
  * [X] Ability to delete/undo strokes => stroke ID - 2h
  * [X] Finding strokes that intersect a given line - 3h
  * [-] Open wheel on triple tap - 2h
  * [-] Optimize active stroke rendering using partial buffering - 1h --> Garbage
* [X] Improve stroke triangularization
* [X] Use TRIANGLE_STRIP with double buffer size (+50% performance boost)
* [ ] Preserve scroll on refresh
* [ ] Split initial package
* [ ] Download notes as PNG
* [ ] Optimize physics engine & rewrite in WebAssembly (not necessary for now, rendering is the bottleneck)
* [ ] Pen prediction (very hard, requires neural nets), note: PointerEvent.getPredictedEvents() is absolute garbage

### Selection
* [X] Ability to select
  * [X] Draw selection lasso
  * [X] Find selected strokes on release
  * [X] Highlight selected strokes
  * [X] Draw boundry box
* [X] Ability to move
  * [X] Detect drag
  * [X] Move selection
* [X] Ability to transform
  * [X] Draw control points
  * [X] Draw rotation point
  * [X] Detect drag on control points
  * [X] Update selection

### PDF import
* [X] Render PDF to canvas
* [X] Render all pages with proper transform
* [X] Dynamic resolution
* [X] Highlighter transparency
* [ ] Infinite zoom

### Tech debt
* [ ] Send live collaboration update on scroll (not just on pointer move), so that pointer appears to move when scrolling
* [ ] Careful about storing collaborators in memory in Server, probably better to use mongo when lots of users
* [ ] When undoing stroke erase, insert stroke back to its initial position, not as a new stroke
* [ ] Load stokes in small batches, not all at once, better for user experience

# License

All right reserved.