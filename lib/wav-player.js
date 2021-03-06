/* ------------------------------------------------------------------
* node-wav-player - wav-player.js
*
* Copyright (c) 2018, Futomi Hatano, All rights reserved.
* Released under the MIT license
* Date: 2018-01-03
* ---------------------------------------------------------------- */
'use strict';

const mFs = require('fs');
const mSpawn = require('child_process').spawn;

/* ------------------------------------------------------------------
* Constructor: WavPlayer()
* ---------------------------------------------------------------- */
const WavPlayer = function() {
	this._OS = process.platform;
	this._proc = null;
	this._called_stop = false;
};

/* ------------------------------------------------------------------
* Method: request(params)
* - params  | Object | Required |
*   - path  | String | Required | Path of a wav file
*   - sync  | Boolean | Optional | Default is `false`
* ---------------------------------------------------------------- */
WavPlayer.prototype.play = function(params) {
	this._called_stop = false;
	let promise = new Promise((resolve, reject) => {
		if(!params || typeof(params) !== 'object') {
			reject(new Error('The `path` is required.'));
			return;
		}
		let path = '';
		if('path' in params) {
			path = params['path'];
		} else {
			reject(new Error('The `path` is required.'));
			return;
		}
		if(typeof(path) !== 'string' || path === '') {
			reject(new Error('The `path` must be a non-empty string.'));
			return;
		}
		if(!mFs.existsSync(path)) {
			reject(new Error('The file of the `path` was not found.'));
			return;
		}

		let sync = false;
		if('sync' in params) {
			sync = params['sync'];
		}
		if(typeof(sync) !== 'boolean') {
			reject(new Error('The `sync` must be a boolean.'));
			return;
		}

		let os = this._OS;
		if(os === 'win32') {
			this._proc = mSpawn('powershell', [
				'-c',
				'(New-Object Media.SoundPlayer "' + path + '").PlaySync();'
			]);
		} else if(os === 'darwin') {
			this._proc = mSpawn('afplay', [path]);
		} else if(os === 'linux') {
			this._proc = mSpawn('aplay', [path]);
		} else {
			reject(new Error('The wav file can not be played on this platform.'));
		}

		let timer = null;
		if(!sync) {
			timer = setTimeout(() => {
				this._proc.removeAllListeners('close');
				resolve();
			}, 500);
		}

		this._proc.on('close', (code) => {
			if(timer) {
				clearTimeout(timer);
			}
			if(this._called_stop === true) {
				resolve();
			} else {
				if(code === 0) {
					if(sync) {
						resolve();
					}
				} else {
					reject(new Error('Failed to play the wav file (' + code + ')'));
				}
			}
		});
	});
	return promise;
};

WavPlayer.prototype.stop = function() {
	this._called_stop = true;
	if(this._proc) {
		this._proc.kill();
	}
};

module.exports = new WavPlayer();
