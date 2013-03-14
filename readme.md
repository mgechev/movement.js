#Movement.js

Movement.js is library for recognition of basic gestures using JavaScript and HTML5. Demo videos can be found [here](https://www.youtube.com/watch?v=0_yfU_iNUYo) and [here](https://www.youtube.com/watch?v=7C0D2CkD3pc).

#How to use it?

You can initialize it by:

    Movement.init(callbacks);

The `callbacks` object can contain the following callbacks:

* `movementChanged` - callback which will be invoked when the user gesture is changed.
* `positionChanged` - callback which will be invoked when the user change his position in the visible area.

Both callbacks accept a single argument the new callback/movement.

###List of movements

This is list of all gestures which Movement.js can currently recognize:

* `STAND`
* `LEFT_ARM_UP`
* `RIGHT_ARM_UP`
* `ARMS_UP`
* `SQUAT_LEFT_ARM_UP`
* `SQUAT_RIGHT_ARM_UP`
* `LEFT_LEG_UP`
* `SQUAT`
* `EMPTY`
* `RIGHT_LEG_UP`

All movements are located in the namespace `Movement.movements`.

###List of positions

This is list of all positions which Movement.js supports currently:

* `LEFT`
* `RIGHT`
* `MIDDLE`
* `EMPTY`

All positions are located in the namespace `Movement.positions`.

###Example

    Movement.init({
        positionChanged: function (pos) {
            if (pos === Movement.positions.LEFT) {
                console.log('You\'re in the left part of the visible zone');
            }
        },
        movementChanged: function (mov) {
            if (mov === Movement.movements.RIGHT_LEG_UP) {
                console.log('You\'re kicking?');
            }
        }
    });

#License

This software is distributed under the terms of the MIT license.
