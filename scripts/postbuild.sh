#!/bin/bash

# exit on error
set -e

# system commands
CP=/bin/cp
ZIP=/usr/bin/zip

# directories
SCRIPT_DIR=$( cd "$( dirname "$0" )" && pwd -P )
PROJECT_ROOT=$( dirname "${SCRIPT_DIR}" )
DIST_DIR="${PROJECT_ROOT}/dist"
FIREFOX_DIR="${DIST_DIR}/firefox"
CHROME_DIR="${DIST_DIR}/chrome"

# copy js files
${CP} -f ${DIST_DIR}/firefox/js/*.js "${DIST_DIR}/chrome/js/"

# archive files

echo -e "\nPackaging Firefox extension: ${DIST_DIR}/firefox.zip\n"
( cd "${FIREFOX_DIR}" && ${ZIP} -r ../firefox.zip * )

echo -e "\nPackaging Chrome extension: ${DIST_DIR}/chrome.zip\n"
( cd "${CHROME_DIR}" && ${ZIP} -r ../chrome.zip * )
