# Self-hosting Word Quest

This document follows the Microsoft Writing Style Guide.

Word Quest is a static web app. You can host your own copy from a clone of this repository.
The app you serve works offline after the first load, exactly like the official copy, and
makes no network calls beyond your own host.

## First setup

```
git clone https://github.com/BillNDD/CVCGame.git
cd CVCGame
npm ci
npm ci --prefix app
npm --prefix app run build
```

The finished app is the `app/dist` folder. Serve it over HTTPS (or on `localhost`) with any
static file server. The service worker and the microphone need a secure origin.

## To update your copy

```
git pull
npm ci
npm ci --prefix app
npm --prefix app run build
```

Then serve the new `app/dist`. Devices with your copy installed update the same way the
official copy does: an adult opens the "Grown-ups corner", taps "Check for updates", and
applies the new version. The check compares against your host's `version.json`, so it works
for a self-hosted copy too. Saved progress lives on each device and is never touched by an
update.

## Good practice

- Run `npm run gauntlet` after `git pull` if you changed anything. A red gauntlet means do
  not serve the build.
- Keep your copy public-path-agnostic: the build uses relative paths, so any folder works.
