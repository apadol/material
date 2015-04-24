(function() {
'use strict';

/*
 * This var has to be outside the angular factory, otherwise when
 * there are multiple material apps on the same page, each app
 * will create its own instance of this array and the app's IDs
 * will not be unique.
 */
var nextUniqueId = ['0','0','0'];

angular.module('material.core')
.factory('$mdUtil', function($cacheFactory, $document, $timeout, $q, $window, $mdConstant) {
  var Util;

  function getNode(el) {
    return el[0] || el;
  }

  return Util = {
    now: window.performance ?
      angular.bind(window.performance, window.performance.now) :
      Date.now,

    clientRect: function(element, offsetParent, isOffsetRect) {
      var node = getNode(element);
      offsetParent = getNode(offsetParent || node.offsetParent || document.body);
      var nodeRect = node.getBoundingClientRect();

      // The user can ask for an offsetRect: a rect relative to the offsetParent,
      // or a clientRect: a rect relative to the page
      var offsetRect = isOffsetRect ?
        offsetParent.getBoundingClientRect() :
        { left: 0, top: 0, width: 0, height: 0 };
      return {
        left: nodeRect.left - offsetRect.left,
        top: nodeRect.top - offsetRect.top,
        width: nodeRect.width,
        height: nodeRect.height
      };
    },
    offsetRect: function(element, offsetParent) {
      return Util.clientRect(element, offsetParent, true);
    },
    disableScrollAround: function(element) {
      var parentContent = element instanceof angular.element ? element[0] : element;
      var lastParent;
      var disableTarget, scrollEl, useDocElement;
      while (parentContent = this.getClosest(parentContent, 'MD-CONTENT', true)) {
        if (isScrolling(parentContent)) {
          disableTarget = angular.element(parentContent);
        } else {
          lastParent = parentContent;
        }
      }
      if (!disableTarget) {
        if (!lastParent ||
          $document[0].body.scrollTop || $document[0].documentElement.scrollTop ) {
          disableTarget = angular.element($document[0].body);
        } else {
          disableTarget = angular.element(lastParent);
        }
      }

      if (disableTarget[0].nodeName == 'BODY' && $document[0].documentElement.scrollTop) {
        scrollEl = $document[0].documentElement;
        useDocElement = true;
      } else {
        scrollEl = disableTarget[0];
      }

      var heightOffset = scrollEl.scrollTop;
      var originalWidth = scrollEl.clientWidth;

      var restoreStyle = disableTarget.attr('style');
      var disableStyle = $window.getComputedStyle(disableTarget[0]);
      var wrapperEl = angular.element('<div class="md-virtual-scroll-container"><div class="md-virtual-scroller"></div></div>');
      var virtualScroller = wrapperEl.children().eq(0);
      virtualScroller.append(disableTarget.children());
      disableTarget.append(wrapperEl);
      var originalScrollBarShow = originalWidth < scrollEl.clientWidth;

      computeScrollbars(disableStyle);

      virtualScroller.attr('layout-margin', disableTarget.attr('layout-margin'));
      virtualScroller.css({
        display: disableStyle.display,
        '-webkit-flex-direction': disableStyle.webkitFlexDirection,
        '-ms-flex-direction': disableStyle.msFlexDirection,
        'flex-direction': disableStyle.flexDirection,
        '-webkit-align-items': disableStyle.webkitAlignItems,
        '-ms-flex-align': disableStyle.msFlexAlign,
        'align-items': disableStyle.alignItems,
        '-webkit-justify-content': disableStyle.webkitJustifyContent,
        '-ms-flex-pack': disableStyle.msFlexPack,
        'justify-content': disableStyle.justifyContent,
        '-webkit-flex': disableStyle.webkitFlex,
        '-ms-flex': disableStyle.msFlex,
        flex: disableStyle.flex
      });
      if (/flex$/.test(disableStyle.display)) {
        virtualScroller.css('height', '100%');
      }

      computeSize();

      angular.element($window).on('resize', computeSize);

      function computeSize() {
        if (restoreStyle) {
          disableTarget.attr('style', restoreStyle);
        } else {
          disableTarget[0].removeAttribute('style');
        }
        virtualScroller.css('position', 'static');
        var computedStyle = $window.getComputedStyle(disableTarget[0]);
        computeScrollbars(computedStyle);
        var innerWidth = disableTarget[0].clientWidth;
        if (computedStyle.boxSizing == 'border-box') {
          innerWidth -= parseFloat(computedStyle.paddingLeft, 10);
          innerWidth -= parseFloat(computedStyle.paddingRight, 10);
        }
        wrapperEl.css({
          'max-width': innerWidth + 'px'
        });
        disableTarget.css('position', 'relative');
        virtualScroller.css('position', 'absolute');
      }

      function computeScrollbars(computedStyle) {
        var scrollBarsShowing = !Util.floatingScrollbars()
            && computedStyle.overflowY != 'hidden'
            && (
              virtualScroller[0].clientHeight > scrollEl.clientHeight
              || originalScrollBarShow
            );

        var scrollerOffset = -1 * (heightOffset - parseFloat(disableStyle.paddingTop, 10));
        disableTarget.css('padding-top', '0px');

        if (scrollBarsShowing) {
          disableTarget.css('overflow-y', 'scroll');
        }
        virtualScroller.css('top', scrollerOffset + 'px');

        var innerHeight = parseFloat(computedStyle.height, 10);
        if (computedStyle.boxSizing == 'border-box') {
          innerHeight -= parseFloat(computedStyle.paddingTop, 10);
          innerHeight -= parseFloat(computedStyle.paddingBottom, 10);
        }

        wrapperEl.css('height', innerHeight + 'px');
        return scrollBarsShowing;
      }

      function isScrolling(el) {
        if (el instanceof angular.element) el = el[0];
        return el.scrollHeight > el.offsetHeight;
      }

      return function restoreScroll() {
        disableTarget.append(virtualScroller.children());
        wrapperEl.remove();
        angular.element($window).off('resize', computeSize);
        disableTarget.attr('style', restoreStyle || false);
        if (useDocElement) {
          $document[0].documentElement.scrollTop = heightOffset;
        } else {
          disableTarget[0].scrollTop = heightOffset;
        }
      };
    },

    floatingScrollbars: function() {
      if (this.floatingScrollbars.cached === undefined) {
        var tempNode = angular.element('<div style="width: 100%; z-index: -1; position: absolute; height: 35px; overflow-y: scroll"><div style="height: 60;"></div></div>');
        $document[0].body.appendChild(tempNode[0]);
        this.floatingScrollbars.cached = (tempNode[0].offsetWidth == tempNode[0].childNodes[0].offsetWidth);
        tempNode.remove();
      }
      return this.floatingScrollbars.cached;
    },

    // Mobile safari only allows you to set focus in click event listeners...
    forceFocus: function(element) {
      var node = element[0] || element;

      document.addEventListener('click', function focusOnClick(ev) {
        if (ev.target === node && ev.$focus) {
          node.focus();
          ev.stopImmediatePropagation();
          ev.preventDefault();
          node.removeEventListener('click', focusOnClick);
        }
      }, true);

      var newEvent = document.createEvent('MouseEvents');
      newEvent.initMouseEvent('click', false, true, window, {}, 0, 0, 0, 0,
                       false, false, false, false, 0, null);
      newEvent.$material = true;
      newEvent.$focus = true;
      node.dispatchEvent(newEvent);
    },

    transitionEndPromise: function(element, opts) {
      opts = opts || {};
      var deferred = $q.defer();
      element.on($mdConstant.CSS.TRANSITIONEND, finished);
      function finished(ev) {
        // Make sure this transitionend didn't bubble up from a child
        if (!ev || ev.target === element[0]) {
          element.off($mdConstant.CSS.TRANSITIONEND, finished);
          deferred.resolve();
        }
      }
      if (opts.timeout) $timeout(finished, opts.timeout);
      return deferred.promise;
    },

    fakeNgModel: function() {
      return {
        $fake: true,
        $setTouched: angular.noop,
        $setViewValue: function(value) {
          this.$viewValue = value;
          this.$render(value);
          this.$viewChangeListeners.forEach(function(cb) { cb(); });
        },
        $isEmpty: function(value) {
          return ('' + value).length === 0;
        },
        $parsers: [],
        $formatters: [],
        $viewChangeListeners: [],
        $render: angular.noop
      };
    },

    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds.
    // @param wait Integer value of msecs to delay (since last debounce reset); default value 10 msecs
    // @param invokeApply should the $timeout trigger $digest() dirty checking
    debounce: function (func, wait, scope, invokeApply) {
      var timer;

      return function debounced() {
        var context = scope,
          args = Array.prototype.slice.call(arguments);

        $timeout.cancel(timer);
        timer = $timeout(function() {

          timer = undefined;
          func.apply(context, args);

        }, wait || 10, invokeApply );
      };
    },

    // Returns a function that can only be triggered every `delay` milliseconds.
    // In other words, the function will not be called unless it has been more
    // than `delay` milliseconds since the last call.
    throttle: function throttle(func, delay) {
      var recent;
      return function throttled() {
        var context = this;
        var args = arguments;
        var now = Util.now();

        if (!recent || (now - recent > delay)) {
          func.apply(context, args);
          recent = now;
        }
      };
    },

    /**
     * Measures the number of milliseconds taken to run the provided callback
     * function. Uses a high-precision timer if available.
     */
    time: function time(cb) {
      var start = Util.now();
      cb();
      return Util.now() - start;
    },

    /**
     * nextUid, from angular.js.
     * A consistent way of creating unique IDs in angular. The ID is a sequence of alpha numeric
     * characters such as '012ABC'. The reason why we are not using simply a number counter is that
     * the number string gets longer over time, and it can also overflow, where as the nextId
     * will grow much slower, it is a string, and it will never overflow.
     *
     * @returns an unique alpha-numeric string
     */
    nextUid: function() {
      var index = nextUniqueId.length;
      var digit;

      while(index) {
        index--;
        digit = nextUniqueId[index].charCodeAt(0);
        if (digit == 57 /*'9'*/) {
          nextUniqueId[index] = 'A';
          return nextUniqueId.join('');
        }
        if (digit == 90  /*'Z'*/) {
          nextUniqueId[index] = '0';
        } else {
          nextUniqueId[index] = String.fromCharCode(digit + 1);
          return nextUniqueId.join('');
        }
      }
      nextUniqueId.unshift('0');
      return nextUniqueId.join('');
    },

    // Stop watchers and events from firing on a scope without destroying it,
    // by disconnecting it from its parent and its siblings' linked lists.
    disconnectScope: function disconnectScope(scope) {
      if (!scope) return;

      // we can't destroy the root scope or a scope that has been already destroyed
      if (scope.$root === scope) return;
      if (scope.$$destroyed ) return;

      var parent = scope.$parent;
      scope.$$disconnected = true;

      // See Scope.$destroy
      if (parent.$$childHead === scope) parent.$$childHead = scope.$$nextSibling;
      if (parent.$$childTail === scope) parent.$$childTail = scope.$$prevSibling;
      if (scope.$$prevSibling) scope.$$prevSibling.$$nextSibling = scope.$$nextSibling;
      if (scope.$$nextSibling) scope.$$nextSibling.$$prevSibling = scope.$$prevSibling;

      scope.$$nextSibling = scope.$$prevSibling = null;

    },

    // Undo the effects of disconnectScope above.
    reconnectScope: function reconnectScope(scope) {
      if (!scope) return;

      // we can't disconnect the root node or scope already disconnected
      if (scope.$root === scope) return;
      if (!scope.$$disconnected) return;

      var child = scope;

      var parent = child.$parent;
      child.$$disconnected = false;
      // See Scope.$new for this logic...
      child.$$prevSibling = parent.$$childTail;
      if (parent.$$childHead) {
        parent.$$childTail.$$nextSibling = child;
        parent.$$childTail = child;
      } else {
        parent.$$childHead = parent.$$childTail = child;
      }
    },

    /*
     * getClosest replicates jQuery.closest() to walk up the DOM tree until it finds a matching nodeName
     *
     * @param el Element to start walking the DOM from
     * @param tagName Tag name to find closest to el, such as 'form'
     */
    getClosest: function getClosest(el, tagName, onlyParent) {
      if (el instanceof angular.element) el = el[0];
      tagName = tagName.toUpperCase();
      if (onlyParent) el = el.parentNode;
      if (!el) return null;
      do {
        if (el.nodeName === tagName) {
          return el;
        }
      } while (el = el.parentNode);
      return null;
    },

    /**
     * Functional equivalent for $element.filter(‘md-bottom-sheet’)
     * useful with interimElements where the element and its container are important...
     */
    extractElementByName: function (element, nodeName) {
      for (var i = 0, len = element.length; i < len; i++) {
        if (element[i].nodeName.toLowerCase() === nodeName){
          return angular.element(element[i]);
        }
      }
      return element;
    },

    /**
     * Give optional properties with no value a boolean true by default
     */
    initOptionalProperties : function (scope, attr, defaults ) {
       defaults = defaults || { };
       angular.forEach(scope.$$isolateBindings, function (binding, key) {
         if (binding.optional && angular.isUndefined(scope[key])) {
           var hasKey = attr.hasOwnProperty(attr.$normalize(binding.attrName));

           scope[key] =  angular.isDefined(defaults[key]) ? defaults[key] : hasKey;
         }
       });
    }

  };

});

/*
 * Since removing jQuery from the demos, some code that uses `element.focus()` is broken.
 *
 * We need to add `element.focus()`, because it's testable unlike `element[0].focus`.
 *
 * TODO(ajoslin): This should be added in a better place later.
 */

angular.element.prototype.focus = angular.element.prototype.focus || function() {
  if (this.length) {
    this[0].focus();
  }
  return this;
};
angular.element.prototype.blur = angular.element.prototype.blur || function() {
  if (this.length) {
    this[0].blur();
  }
  return this;
};

})();
