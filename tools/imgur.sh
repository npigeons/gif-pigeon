#!/usr/bin/env bash

curl $2 --output $3.mp4 > /dev/null 2> /dev/null
curl -X POST -H "Authorization: Bearer $1" -F "image=@$3.mp4" https://api.imgur.com/3/upload 2> /dev/null
rm $3.mp4
