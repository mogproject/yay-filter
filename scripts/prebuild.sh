#!/bin/bash

# exit on error
set -e

# system commands
RM=/bin/rm
MV=/bin/mv
MKDIR=/bin/mkdir
RSYNC=/usr/bin/rsync

# directories
SCRIPT_DIR=$( cd "$( dirname "$0" )" && pwd -P )
PROJECT_ROOT=$( dirname "${SCRIPT_DIR}" )
ASSETS_DIR="${PROJECT_ROOT}/assets"
DIST_DIR="${PROJECT_ROOT}/dist"
FIREFOX_DIR="${DIST_DIR}/firefox"
CHROME_DIR="${DIST_DIR}/chrome"

# copy options
exclude_opts="--exclude=*/.* --exclude=*.xcf"

# clean dist directory
${RM} -fr "${DIST_DIR}"
${MKDIR} "${DIST_DIR}"

# copy static files
${RSYNC} -r ${exclude_opts} "${ASSETS_DIR}/" "${FIREFOX_DIR}"
${RSYNC} -r ${exclude_opts} "${ASSETS_DIR}/" "${CHROME_DIR}"

# move manifest files
${MV} -f "${FIREFOX_DIR}/manifest_firefox.json" "${FIREFOX_DIR}/manifest.json"
${RM} -f "${FIREFOX_DIR}/manifest_chrome.json"

${MV} -f "${CHROME_DIR}/manifest_chrome.json" "${CHROME_DIR}/manifest.json"
${RM} -f "${CHROME_DIR}/manifest_firefox.json"
