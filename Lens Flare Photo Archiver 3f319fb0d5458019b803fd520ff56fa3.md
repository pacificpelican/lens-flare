# Pic Photo Archiver

Last edited time: November 7, 2026 3:21 PM
Status: Planning
Created time: October 8, 2026 1:32 AM
Last edited by: Daniel McKeown
Category: web app

## About this project

- Pic (called Lens Flare in previous plans): a tool for archiving, sorting, and editing digital photos
- offer some of the same functionality of Aperture (or iPhoto, or Windows Photos Legacy, or Photos.app, or Lightroom)
    - download photos from camera (SD/microSD card drive on hardware via web or system APIs)
    - support for modern photo formats: .heic, Canon raw formats, Nikon raw formats, webP, AVIF, along with legacy formats like jpg, GIF, and png
    - view raw photos and export as other formats
    - group options for export etc.
    - support for user accounts based on email and password
    - support for user being able to delete all data and uploads (Settings)
    - photos each have a “page” for viewing individually, with a large preview of the image, the title (default from file name but can be updated by user) and a download button to download the original and maybe a resized and/or converted-to-AVIF version
        - EXIF data should be read from the file and displayed on the page when possible
        - the page should also have a generated description of what is in the photo
            - the app will optionally have a configuration option (like in a config.php page) where the user can specify whether AI is off, running on an Ollama install, or using a cloud AI provider; also, the model that is to run—for example, if Ollama is running it could run llama3.2 for example but in this app we might consider defaulting to something possibly more suited to this task like [D3]([https://ollama.com/library/d3](https://ollama.com/library/d3))
- main user interface should be a “contact sheet” grid of photo previews, sorted by default for newest first; mousing over an image preview should give title and EXIF date (upload date would be backup) and when the image preview is clicked it goes to the photo’s “page”
- this will be a desktop-first web app and it would be helpful if architectural decisions are made keeping in mind that this could be built at some point hopefully as a standalone app using a platform like Electron or something; also it would be good if it were actually deployable so please allow multiple user accounts; maybe let a new user just start using it and create a sort-of account until they actually give a username/password and sign up, or at the very least have a login/registration form right at first run; please try to remember logins until users log out
- Could the front page of the app have a kind of simple “marketing page” that explains what the app does and a few basics about using it and the credit: Created by [Daniel McKeown](https://danieljmckeown.com)
- For the flexibility to run in different environments I would like to follow my current data persistence [standards]([https://github.com/pacificpelican/game-template/blob/main/spec/alta-redwood-standards-for-game-design-v2.md](https://github.com/pacificpelican/game-template/blob/main/spec/alta-redwood-standards-for-game-design-v2.md)) for web apps:
    
    > 
    > 
    > 
    > ```
    > Persistence Layer:                                                   |
    > |    - Default: Local File-Based / SQLite (Zero-Config Local Play)      |
    > |    - Production: MySQL / MariaDB (Configured via config.php)          |
    > |    - No-PHP Fallback: Browser localStorage / IndexedDB
    > ```
    > 
- 
- design concept: use translucency where helpful; sharper corners on most UI elements; light grays in backgrounds; visible, glassy border around photo previews on contact sheet; no border around photo on photo's page; reasonably large type, mostly sans; warn before deletion; long press or mouseover on contact sheet image puts shows larger preview of image on screen; purple for accent color when that can work.
- on the photo's page there should be a user-editable field for a (user) description, kind of semi-hidden because there may also be the AI description, also you should be able to add tags to the photos, and of course delete the photo and its data