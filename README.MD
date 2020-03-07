# bilibili-livestream-recorder

A simple bilibili livestream recorder wirtten with node.js

## Requirements

 - node.js
 - ffmpeg

## Usage

1. Copy `settings.sample.js` to `settings.js`
2. Edit the `settings.js`
3. `node index`

## Known issues

 - When downloading multiple streams at the same time, server returns code `475` randomly

## TO-DO

 - Native HLS downloading support(Including stream URL renewal)

## LICENSE

```
    bilibili-livestream-recorder - A simple bilibili livestream recorder wirtten with node.js
    Copyright (C) 2020  Sparta_EN<nya@sparta-en.org>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
```
