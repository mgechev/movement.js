
var Movement;

(function () {

    Movement = {};

    Movement.constants = {
        WIDTH: 400,
        HEIGHT: 300,
        MOTION_LIMIT: 1576745,
        MIN_FRAMES_WITHOUT_MOTION: 5,
        FRAME_RATE: 24,
        NOICE_DIFF: 50
    };

    Filters = {};

    Filters.getPixels = function(img) {
      var c = this.getCanvas(img.width, img.height);
      var ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0,0,c.width,c.height);
    };

    Filters.getCanvas = function(w,h) {
      var c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    };

    Filters.filterImage = function(filter, image, var_args) {
      var args = [this.getPixels(image)];
      for (var i=2; i<arguments.length; i++) {
        args.push(arguments[i]);
      }
      return filter.apply(null, args);
    };

    Filters.grayscale = function(pixels, args) {
      var d = pixels.data;
      for (var i=0; i<d.length; i+=4) {
        var r = d[i];
        var g = d[i+1];
        var b = d[i+2];
        // CIE luminance for the RGB
        // The human eye is bad at seeing red and blue, so we de-emphasize them.
        var v = 0.2126*r + 0.7152*g + 0.0722*b;
        d[i] = d[i+1] = d[i+2] = v
      }
      return pixels;
    };

    Filters.threshold = function(pixels, threshold) {
      var d = pixels.data;
      for (var i=0; i<d.length; i+=4) {
        var r = d[i];
        var g = d[i+1];
        var b = d[i+2];
        var v = (0.2126*r + 0.7152*g + 0.0722*b >= threshold) ? 255 : 0;
        d[i] = d[i+1] = d[i+2] = v
      }
      return pixels;
    };

    Filters.difference = function(below, above) {
      var a = below.data;
      var b = above.data;
      var dst = a;
      var f = 1/255;
      for (var i=0; i<a.length; i+=4) {
        dst[i] = Math.abs(a[i]-b[i]);
        dst[i+1] = Math.abs(a[i+1]-b[i+1]);
        dst[i+2] = Math.abs(a[i+2]-b[i+2]);
        dst[i+3] = a[i+3]+((255-a[i+3])*b[i+3])*f;
      }
      return below;
    };

    Filters.verticalIntensityStatistics = function (pixels, width) {
        var d = pixels.data,
            g = [],
            current,
            idx;
        for (var i = 0; i < d.length; i += 4) {
            idx = Math.floor((i / 4) / width);
            current = g[idx] || 0;
            g[idx] = current + d[i]; //the image is grayscale
        }
        return g;
    };

    Filters.horizontalIntensityStatistics = function (pixels, height) {
        var d = pixels.data,
            g = [],
            current,
            idx;
        for (var i = 0; i < d.length; i += 4) {
            idx = Math.floor((i / 4) / height); //because of rgba
            current = g[idx] || 0;
            g[idx] = current + d[i]; //the image is grayscale
        }
        return g;
    };

    var vid,
        current,
        background,
        last,
        diffCanvas,
        initialized,
        previous = false,
        backgroundInitialized = false,
        framesWithoutMotion = 0,
        currentGesture,
        getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia,
        URL = URL || webkitURL || mozURL;

    Movement.init = function () {
        var self = this;
        vid = document.createElement('video');
        document.body.appendChild(vid);
        vid.style.position = 'absolute';
        vid.width = Movement.constants.WIDTH;
        vid.height = Movement.constants.HEIGHT;
        this._initCanvases();
        getUserMedia.call(navigator, { video: true }, function (stream) {
            if (!initialized) {
                initialized = true;
                vid.src = URL.createObjectURL(stream);
                vid.play();
                self._start();
            }
            initialized = true;
        }, function () {
            alert('Access forbidden');
        });
    };

    Movement._initCanvases = function () {
        can = document.createElement('canvas');
        document.body.appendChild(can);
        can.style.border = '3px solid red';
        can.style.position = 'absolute';

        background = document.createElement('canvas');
        document.body.appendChild(background);
        background.style.border = '3px solid green';
        background.style.position = 'absolute';

        last = document.createElement('canvas');
        document.body.appendChild(last);
        last.style.border = '3px solid blue';
        last.style.position = 'absolute';

        diffCanvas = document.createElement('canvas');
        document.body.appendChild(diffCanvas);
        diffCanvas.style.border = '3px solid yellow';
        diffCanvas.style.position = 'absolute';

        diffCanvas.width = last.width = background.width = can.width = Movement.constants.WIDTH;
        diffCanvas.height = last.height = background.height = can.height = Movement.constants.HEIGHT;
    };

    Movement._start = function () {
        var interval = 1000 / Movement.constants.FRAME_RATE,
            self = this;
        setInterval(function () {
            self._handleFrame();
        }, interval);
    };

    Movement._handleFrame = function () {
        if (!backgroundInitialized) {
            this._initializeBackground();
            backgroundInitialized = true;
        } else {
            var gesture = this._processFrame();
            if (gesture && gesture !== currentGesture) {
                document.getElementById('label').innerHTML = gesture;
            }
        }
    };

    Movement._processFrame = function () {
        var data = Filters.filterImage(Filters.grayscale, vid),
            gesture;
        this._putData(can, data);
        data = Filters.filterImage(Filters.difference, can, this._getData(background));
        this._putData(can, data);
        data = Filters.filterImage(Filters.threshold, can, 50);
        this._putData(can, data);
        if (previous) {
            gesture = this._getGesture();
        } else {
            previous = true;
        }
        last.getContext('2d').drawImage(can, 0, 0, can.width, can.height);
        return gesture;
    };

    Movement._getGesture = function () {
        var diff = Filters.filterImage(Filters.difference, can, this._getData(last)),
            diffStat;
        this._putData(diffCanvas, diff);
        diff = Filters.filterImage(Filters.threshold, diffCanvas, 50);
        this._putData(diffCanvas, diff);
        diffStat = Filters.filterImage(Filters.verticalIntensityStatistics, diffCanvas, diffCanvas.width);
        if (this._activeGesture(diffStat)) {
            return this._recognizeGesture();
        }
        return currentGesture;
    };

    Movement._initializeBackground = function () {
        var currentData = Filters.filterImage(Filters.grayscale, vid);
        this._putData(background, currentData);
    };

    Movement._activeGesture = function (diff) {
        var changedPixels = 0;
        for (var i = 0; i < diff.length; i += 1) {
            changedPixels += diff[i];
        }
        if (changedPixels <= Movement.constants.MOTION_LIMIT) {
           framesWithoutMotion += 1; 
        } else {
            framesWithoutMotion = 0;
        }
        if (framesWithoutMotion >= Movement.constants.MIN_FRAMES_WITHOUT_MOTION) {
            return true;
        }
        return false;
    };

    Movement._recognizeGesture = function () {
        var vD = Filters.filterImage(Filters.verticalIntensityStatistics, can, diffCanvas.width),
            hD = Filters.filterImage(Filters.horizontalIntensityStatistics, can, diffCanvas.height);
        if (this._sceneEmpty(hD)) {
            return 'NOBODY';
        } else {
            if (this._handsUp(vD)) {
                return 'HANDS-UP';
            }
            if (this._stand(vD)) {
                return 'STAND';
            }
        }
        return 'SQUAT';
    };

    Movement._sceneEmpty = function (data) {
        var minDiff = Movement.constants.NOICE_DIFF,
            bigger = 0;
        for (var i = 0; i < data.length; i += 1) {
            if (data[i] / 255 > minDiff) {
                bigger += 1;
            }
        }
        return bigger > minDiff ? false : true;
    };

    Movement._stand = function (data) {
        var requiredHeight = Movement.constants.HEIGHT * 0.6,
            requiredWidth = Movement.constants.WIDTH * 0.1,
            middlePix = 0;
        for (var i = 0; i < data.length; i += 1) {
            if (data[i] / 255 >= requiredHeight) {
                middlePix += 1;
            }
        }
        return (middlePix >= requiredWidth) ? true : false;
    };

    Movement._handsUp = function (data) {
        var width = Movement.constants.WIDTH,
            height = Movement.constants.HEIGHT,
            middle = Math.floor(data.length / 2),
            left = middle,
            right = middle,
            minWidth = width * 0.8;
        for (var i = middle; i < data.length; i += 1) {
            if (data[i] / 255 > minWidth) {
                left -= 1;
                right += 1;
            }
            if (right - left > height * 0.04) {
                return true;
            }
        }
        return false;
    };

    Movement._putData = function (canvas, data) {
        canvas.getContext('2d').putImageData(data, 0, 0);
    };

    Movement._getData = function (canvas) {
        return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    };

}());

Movement.init();
