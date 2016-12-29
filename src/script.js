(function ($) {
    // REALIZAR ALGUNS AJUSTES DE PERFORMANCE: Armazenar valores (chamadas jquery etc) frequentemente utilizados.
    // Organizar o escopo aqui em cima.
    var WALK_MIN_SIZE = 60;
    var WALK_DEFAULT_COLOR = '#2196F3';
    var WALK_SCROLL_DELAY = 500;
    var WALK_BLINK_TRANSITION = false;

    $._WALK_CURRENT_WALKPOINTS;
    $._WALK_CURRENT_ENDCALLBACK;
    $._WALK_CURRENT_POINT;
    $._WALK_MUTATION_OBSERVER;


    function calculatePosition(targetElt) {
        console.log('CALCULATING WALK POSITION:');
        var walkElement = $('#walk-wrapper');

        var holeSize = targetElt.outerHeight() > targetElt.outerWidth() ? targetElt.outerHeight() : targetElt.outerWidth(); // Pegar a maior medida
        if (holeSize < WALK_MIN_SIZE) holeSize = WALK_MIN_SIZE;
        console.log('\thole size:' + holeSize);

        var position = targetElt.offset();
        console.log('\tposition:\n\t\tx: ' + position.left + '\n\t\ty: ' + position.top);

        var scrollTo = (position.top - ($(window).height() / 2)); // Tenta centralizar a tela com a posição do alvo
        if (scrollTo > 0) {
            console.log('\tscrolling to: ' + scrollTo);
            $('html, body').animate({
                scrollTop: scrollTo
            }, WALK_SCROLL_DELAY);
        }

        console.log('\tRENDERING...');
        walkElement.css({
            'height': (holeSize + 20) + 'px',
            'width': (holeSize + 20) + 'px',

            'margin-left': -((holeSize + 20) / 2) + 'px',
            'margin-top': -((holeSize + 20) / 2) + 'px',

            'left': (position.left + (targetElt.outerWidth() / 2)) + 'px',
            'top': (position.top + (targetElt.outerHeight() / 2)) + 'px',
        });

    };

    function calculateTextPosition(targetElt) {
        var position = targetElt.offset();
        var walkContent = $('#walk-content');

        console.log('CALCULATING TEXT POSITION:');
        var canRenderInLeft = position.left + 175 > walkContent.width(); // 175 é a metade da largura do conteudo
        var canRenderInRight = ($(window).width() - (position.left + 175)) > walkContent.width();
        console.log('\tcanRenderInLeft: ' + canRenderInLeft + '\n\tcanRenderInRight: ' + canRenderInRight);

        // REVER
        var canRenderInTop = position.top + walkContent.height() / 2 > $(window).height() / 2;
        var canRenderInBottom = ($(window).height() - position.top + walkContent.height() / 2) > $(window).height() / 2;
        console.log('\tcanRenderInTop: ' + canRenderInTop + '\n\tcanRenderInBottom: ' + canRenderInBottom);

        /* QUADRO DE POSIÇÕES
         LEFT: -170%  -40%    100%
         TOP:  -70%   -70%   -70%     <-- top minimo para posiçao superior. Se a caso o conteudo do texto for grande, diminuir mais ainda este numero

         LEFT: -170%    -40%    100%
         TOP:  -100%    100%    100%
         */

        console.log('\tRENDERING...');
        if (canRenderInRight || canRenderInLeft) {
            $('#walk-content').css({
                'margin-top': '0px',
                'left': canRenderInRight ? '100%' : '-170%',
                'text-align': canRenderInRight ? 'left' : 'right',
            });
        } else { //centralizado
            $('#walk-content').css({
                'margin-top': '20px',
                'left': '-40%',
                'text-align': 'center',
            });
        }
    }

    function updatePositions(element) {
        console.log('\n');
        calculatePosition(element);
        calculateTextPosition(element);
    };

    function setupHandlers(element) {
        $(window).on('resize', function () {
            updatePositions(element)
        });
        $._WALK_MUTATION_OBSERVER = new MutationObserver(function () {
            updatePositions(element)
        });
        $._WALK_MUTATION_OBSERVER.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function cleanHandlersAndListeners() {
        enableScroll();
        $._WALK_MUTATION_OBSERVER.disconnect();
    }



    /**
     * Walk Function. Show a walkthrough for a single point.
     * @param {string}   contentText     Text that will be displayed in the content of the walkthrough;
     * @param {string}   [color]         Optional (for default blue color). Color in hash hex or in rgb() function;
     * @param {function|boolean} [closeCallback] Callback that will be called when the walkthrough point is closed. Or a boolean used to indicate if the walk is compound;
     */
    $.fn.walk = function (contentText, color, closeCallback) {
        var element = this;
        if (!element.width()) return;
        var walkerWrapper = $('#walk-wrapper');
        var contentText = $('#walk-text');

        disableScroll();
        contentText.html(contentText);
        if (walkerWrapper.length == 0) {
            $('body').append("<div id='walk-wrapper'><div id='walk-content'><div id='walk-text'></div><button id='walk-button'>ENTENDI</button></div></div>");
        }
        walkerWrapper.css({
            'border-color': (!!color) ? color : WALK_DEFAULT_COLOR
        });

        if (WALK_BLINK_TRANSITION) {
            setTimeout(function () {
                walkerWrapper.show();
            }, WALK_SCROLL_DELAY);
        }

        calculatePosition(element);
        calculateTextPosition(element);
        setupHandlers(element, closeCallback);

        var confirmCallback = function (ev) {
            if (WALK_BLINK_TRANSITION) walkerWrapper.hide();
            if (!!closeCallback) {
                if (typeof closeCallback == 'Function') closeCallback();
                else {
                    $._WALK_CURRENT_POINT++;
                    var point = $._WALK_CURRENT_WALKPOINTS[$._WALK_CURRENT_POINT];
                    console.log(point);
                    // Se o ponto existe, entao pegue-o!
                    if (!!point) {
                        $('#walk-button').off('click', confirmCallback);
                        $(window).off('resize', updatePositions);
                        $(point.selector).walk(point.text, point.color, true);
                    } else {
                        cleanHandlersAndListeners();
                        if ($._WALK_CURRENT_ENDCALLBACK) $._WALK_CURRENT_ENDCALLBACK();
                    }
                }
            } else {
                cleanHandlersAndListeners();
            }
        };

        $('#walk-button').on('click', confirmCallback);
    };

    /**
     * Set a walkthrough for multiple points in order.
     * @param {object[]} walkPoints A WalkPoints array to set.
     * @param {function} [endCallback] An optional callback that will be executed when the walk is terminated.
     */
    $.walk = function (walkPoints, endCallback) {
        $._WALK_CURRENT_WALKPOINTS = walkPoints;
        $._WALK_CURRENT_POINT = 0;
        $._WALK_CURRENT_ENDCALLBACK = endCallback;

        var point = walkPoints[0];
        $(point.selector).walk(point.text, point.color, true);
    };




    //Locking scroll
    //Thanks to @galambalazs
    // left: 37, up: 38, right: 39, down: 40,
    // spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
    var keys = {
        37: 1,
        38: 1,
        39: 1,
        40: 1,
        32: 1,
        33: 1,
        34: 1
    };

    function preventDefault(e) {
        e = e || window.event;
        if (e.preventDefault)
            e.preventDefault();
        e.returnValue = false;
    }

    function preventDefaultForScrollKeys(e) {
        if (keys[e.keyCode]) {
            preventDefault(e);
            return false;
        }
    }

    function disableScroll() {
        $('html').css({
            'height': '100vh',
            'overflow': 'hidden'
        });
        if (window.addEventListener) // older FF
            window.addEventListener('DOMMouseScroll', preventDefault, false);
        window.onwheel = preventDefault; // modern standard
        window.onmousewheel = document.onmousewheel = preventDefault; // older browsers, IE
        window.ontouchmove = preventDefault; // mobile
        document.onkeydown = preventDefaultForScrollKeys;
    }

    function enableScroll() {
        $('html').css({
            'height': '',
            'overflow': 'auto'
        });
        if (window.removeEventListener)
            window.removeEventListener('DOMMouseScroll', preventDefault, false);
        window.onmousewheel = document.onmousewheel = null;
        window.onwheel = null;
        window.ontouchmove = null;
        document.onkeydown = null;
    }

})(jQuery);
