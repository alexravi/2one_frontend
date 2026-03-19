#!/bin/bash
# Azure App Service startup script for Next.js

npm install
npm run build
npm run start
