/*!
 * jQuery Mobile Events
 *
 * @author Ben Major (www.ben-major.co.uk)
 * @copyright 2011, Ben Major
 * @license MIT
 *
 * Licensed under the MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */


(function($) {
    $.attrFn = $.attrFn || {};

    // navigator.userAgent.toLowerCase() isn't reliable for Chrome installs
    // on mobile devices. As such, we will create a boolean isChromeDesktop
    // The reason that we need to do this is because Chrome annoyingly
    // purports support for touch events even if the underlying hardware
    // does not!

    var isChromeDesktop = ((navigator.userAgent.toLowerCase().indexOf('chrome') > -1) && (
        (navigator.userAgent.toLowerCase().indexOf('windows') > -1) ||
            (navigator.userAgent.toLowerCase().indexOf('macintosh') > -1) ||
            (navigator.userAgent.toLowerCase().indexOf('linux') > -1)
        ));

    var settings = {
        taphold_threshold 	: 750,
        tap_tremor          : 10,

        touch_capable		: ('ontouchstart' in document.documentElement && !isChromeDesktop),
        orientation_support	: ('orientation' in window && 'onorientationchange' in window),

        startevent		: ('ontouchstart' in document.documentElement ) ? 'touchstart' : 'mousedown',
        endevent		: ('ontouchstart' in document.documentElement ) ? 'touchend' : 'mouseup',
        moveevent		: ('ontouchstart' in document.documentElement ) ? 'touchmove' : 'mousemove',
        tapevent		: ('ontouchstart' in document.documentElement ) ? 'tap' : 'click',
        scrollevent		: ('ontouchstart' in document.documentElement ) ? 'touchmove' : 'scroll',

        hold_timer		: null,
        tap_timer		: null
    };

    // Add Event shortcuts:
    $.each( ['tapstart', 'tapend', 'tap', 'taphold', 'scrollstart', 'scrollend', 'orientationchange'], function(i, name) {
        $.fn[name] = function(fn)
        {
            return fn ? this.bind(name, fn) : this.trigger(name);
        };

        $.attrFn[name] = true;
    });

    // tapstart Event:
    $.event.special.tapstart = {
        setup: function() {
            var thisObject = this,
                $this = $(thisObject);

            $this.bind(settings.startevent, function(e) {
                if(e.which && e.which !== 1)
                {
                    return false;
                }
                else
                {
                    // Touch event data:
                    var origEvent = e.originalEvent;
                    var touchData = {
                        'position': {
                            'x': (settings.touch_capable) ? origEvent.touches[0].screenX : e.screenX,
                            'y': (settings.touch_capable) ? origEvent.touches[0].screenY : e.screenY
                        },
                        'offset': {
                            'x': (settings.touch_capable) ? origEvent.touches[0].pageX - origEvent.touches[0].target.offsetLeft : e.offsetX,
                            'y': (settings.touch_capable) ? origEvent.touches[0].pageY - origEvent.touches[0].target.offsetTop : e.offsetY
                        },
                        'time': new Date().getTime(),
                        'target': e.target
                    };

                    triggerCustomEvent(thisObject, 'tapstart', e, touchData);
                    return true;
                }
            });
        }
    };

    // tapend Event:
    $.event.special.tapend = {
        setup: function() {
            var thisObject = this,
                $this = $(thisObject);

            $this.bind(settings.endevent, function(e) {
                // Touch event data:
                var origEvent = e.originalEvent;
                var touchData = {
                    'position': {
                        'x': (settings.touch_capable) ? origEvent.changedTouches[0].screenX : e.screenX,
                        'y': (settings.touch_capable) ? origEvent.changedTouches[0].screenY : e.screenY
                    },
                    'offset': {
                        'x': (settings.touch_capable) ? origEvent.changedTouches[0].pageX - origEvent.changedTouches[0].target.offsetLeft : e.offsetX,
                        'y': (settings.touch_capable) ? origEvent.changedTouches[0].pageY - origEvent.changedTouches[0].target.offsetTop : e.offsetY
                    },
                    'time': new Date().getTime(),
                    'target': e.target
                };
                triggerCustomEvent(thisObject, 'tapend', e, touchData);
                return true;
            });
        }
    };

    // taphold Event:
    $.event.special.taphold = {
        setup: function() {
            var thisObject = this,
                $this = $(thisObject),
                origTarget,
                timer,
                start_pos = { x : 0, y : 0 };

            $this.bind(settings.startevent, function(e) {
                if(e.which && e.which !== 1)
                {
                    return false;
                }
                else
                {
                    $this.data('tapheld', false);
                    origTarget = e.target;

                    var origEvent = e.originalEvent;
                    var start_time = new Date().getTime(),
                        startPosition = {
                            'x': (settings.touch_capable) ? origEvent.touches[0].screenX : e.screenX,
                            'y': (settings.touch_capable) ? origEvent.touches[0].screenY : e.screenY
                        },
                        startOffset = {
                            'x': (settings.touch_capable) ? origEvent.touches[0].pageX - origEvent.touches[0].target.offsetLeft : e.offsetX,
                            'y': (settings.touch_capable) ? origEvent.touches[0].pageY - origEvent.touches[0].target.offsetTop : e.offsetY
                        };

                    start_pos.x = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageX : e.pageX;
                    start_pos.y = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageY : e.pageY;

                    settings.hold_timer = window.setTimeout(function() {

                        var end_x = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageX : e.pageX,
                            end_y = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageY : e.pageY,
                            shakeX  = Math.abs( start_pos.x - end_x ) > settings.tap_tremor,
                            shakeY  = Math.abs( start_pos.y - end_y ) > settings.tap_tremor,
                            shake   = shakeY || shakeX;

                        if( e.target == origTarget && !shake )
                        {
                            $this.data('tapheld', true);

                            var end_time = new Date().getTime(),
                                endPosition = {
                                    'x': (settings.touch_capable) ? origEvent.touches[0].screenX : e.screenX,
                                    'y': (settings.touch_capable) ? origEvent.touches[0].screenY : e.screenY
                                },
                                endOffset = {
                                    'x': (settings.touch_capable) ? origEvent.touches[0].pageX - origEvent.touches[0].target.offsetLeft : e.offsetX,
                                    'y': (settings.touch_capable) ? origEvent.touches[0].pageY - origEvent.touches[0].target.offsetTop : e.offsetY
                                };
                            duration = end_time - start_time;

                            // Build the touch data:
                            var touchData = {
                                'startTime': start_time,
                                'endTime': end_time,
                                'startPosition': startPosition,
                                'startOffset': startOffset,
                                'endPosition': endPosition,
                                'endOffset': endOffset,
                                'duration': duration,
                                'target': e.target
                            }

                            triggerCustomEvent(thisObject, 'taphold', e, touchData);
                        }
                    }, settings.taphold_threshold);

                    return true;
                }
            }).bind(settings.endevent, function() {
                    $this.data('tapheld', false);
                    window.clearTimeout(settings.hold_timer);
                });
        }
    };

    // tap Event:
    $.event.special.tap = {
        setup: function() {
            var self = this,
                $this = $( this ),
                started = false,
                origTarget = null,
                start_time,
                start_pos = { x : 0, y : 0 };

            $this.bind(settings.startevent, function(e) {
                if(e.which && e.which !== 1)
                {
                    return false;
                }
                else
                {
                    started = true;
                    start_pos.x = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageX : e.pageX;
                    start_pos.y = (e.originalEvent.targetTouches) ? e.originalEvent.targetTouches[0].pageY : e.pageY;
                    start_time = new Date().getTime();
                    origTarget = e.target;
                    return true;
                }
            }).bind(settings.endevent, function(e) {
                    // Only trigger if they've started, and the target matches:
                    var end_x = (e.originalEvent.targetTouches) ? e.originalEvent.changedTouches[0].pageX : e.pageX,
                        end_y = (e.originalEvent.targetTouches) ? e.originalEvent.changedTouches[0].pageY : e.pageY,
                        shakeX  = Math.abs( start_pos.x - end_x ) > settings.tap_tremor,
                        shakeY  = Math.abs( start_pos.y - end_y ) > settings.tap_tremor,
                        shake   = shakeY || shakeX;

                    if(origTarget == e.target && started && ((new Date().getTime() - start_time) < settings.taphold_threshold) && !shake )
                    {
                        var origEvent = e.originalEvent;
                        var touchData = {
                            'position': {
                                'x': (settings.touch_capable) ? origEvent.changedTouches[0].screenX : e.screenX,
                                'y': (settings.touch_capable) ? origEvent.changedTouches[0].screenY : e.screenY
                            },
                            'offset': {
                                'x': (settings.touch_capable) ? origEvent.changedTouches[0].pageX - origEvent.changedTouches[0].target.offsetLeft : e.offsetX,
                                'y': (settings.touch_capable) ? origEvent.changedTouches[0].pageY - origEvent.changedTouches[0].target.offsetTop : e.offsetY
                            },
                            'time': new Date().getTime(),
                            'target': e.target
                        };

                        triggerCustomEvent( self, 'tap', e, touchData);
                    }
                });
        }
    };

    // scrollstart Event (also handles scrollend):
    $.event.special.scrollstart = {
        setup: function() {
            var thisObject = this,
                $this = $(thisObject),
                scrolling,
                timer;

            function trigger(event, state)
            {
                scrolling = state;
                triggerCustomEvent(thisObject, scrolling ? 'scrollstart' : 'scrollend', event);
            }

            // iPhone triggers scroll after a small delay; use touchmove instead
            $this.bind(settings.scrollevent, function(event) {
                if(!scrolling)
                {
                    trigger(event, true);
                }

                clearTimeout(timer);
                timer = setTimeout(function() { trigger(event, false); }, 50);
            });
        }
    };

    // This is the orientation change (largely borrowed from jQuery Mobile):
    var win = $(window),
        special_event,
        get_orientation,
        last_orientation,
        initial_orientation_is_landscape,
        initial_orientation_is_default,
        portrait_map = { '0': true, '180': true };

    if(settings.orientation_support)
    {
        var ww = window.innerWidth || $(window).width(),
            wh = window.innerHeight || $(window).height(),
            landscape_threshold = 50;

        initial_orientation_is_landscape = ww > wh && (ww - wh) > landscape_threshold;
        initial_orientation_is_default = portrait_map[window.orientation];

        if((initial_orientation_is_landscape && initial_orientation_is_default) || (!initial_orientation_is_landscape && !initial_orientation_is_default))
        {
            portrait_map = { '-90': true, '90': true };
        }
    }

    $.event.special.orientationchange = special_event = {
        setup: function() {
            // If the event is supported natively, return false so that jQuery
            // will bind to the event using DOM methods.
            if(settings.orientation_support)
            {
                return false;
            }

            // Get the current orientation to avoid initial double-triggering.
            last_orientation = get_orientation();

            win.bind('throttledresize', handler);
            return true;
        },
        teardown: function()
        {
            if (settings.orientation_support)
            {
                return false;
            }

            win.unbind('throttledresize', handler);
            return true;
        },
        add: function(handleObj)
        {
            // Save a reference to the bound event handler.
            var old_handler = handleObj.handler;

            handleObj.handler = function(event)
            {
                event.orientation = get_orientation();
                return old_handler.apply(this, arguments);
            };
        }
    };

    // If the event is not supported natively, this handler will be bound to
    // the window resize event to simulate the orientationchange event.
    function handler()
    {
        // Get the current orientation.
        var orientation = get_orientation();

        if(orientation !== last_orientation)
        {
            // The orientation has changed, so trigger the orientationchange event.
            last_orientation = orientation;
            win.trigger( "orientationchange" );
        }
    }

    $.event.special.orientationchange.orientation = get_orientation = function() {
        var isPortrait = true,
            elem = document.documentElement;

        if(settings.orientation_support)
        {
            isPortrait = portrait_map[window.orientation];
        }
        else
        {
            isPortrait = elem && elem.clientWidth / elem.clientHeight < 1.1;
        }

        return isPortrait ? 'portrait' : 'landscape';
    };

    // throttle Handler:
    $.event.special.throttledresize = {
        setup: function()
        {
            $(this).bind('resize', throttle_handler);
        },
        teardown: function()
        {
            $(this).unbind('resize', throttle_handler);
        }
    };

    var throttle = 250,
        throttle_handler = function()
        {
            curr = (new Date()).getTime();
            diff = curr - lastCall;

            if(diff >= throttle)
            {
                lastCall = curr;
                $(this).trigger('throttledresize');

            }
            else
            {
                if(heldCall)
                {
                    window.clearTimeout(heldCall);
                }

                // Promise a held call will still execute
                heldCall = window.setTimeout(handler, throttle - diff);
            }
        },
        lastCall = 0,
        heldCall,
        curr,
        diff;

    // Trigger a custom event:
    function triggerCustomEvent( obj, eventType, event, touchData ) {
        var originalType = event.type;
        event.type = eventType;

        $.event.dispatch.call( obj, event, touchData );
        event.type = originalType;
    }

    // Correctly bind anything we've overloaded:

    $.event.special.scrollend = {
        setup: function () {
            $(this).bind('scrollstart', $.noop);
        }
    };

}) (jQuery);
