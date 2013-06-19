#!/usr/bin/env bash

[ -d ~/.valuepack ]       || mkdir ~/.valuepack

VALUEPACK_MINE_DB=~/.valuepack/valuepack-mine.db

echo 'Your valuepack has been initialized at ~/.valuepack.'
command -v tree >/dev/null 2>&1 && tree ~/.valuepack
