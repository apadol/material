/**
 * @ngdoc module
 * @name material.components.sidenav
 *
 * @description
 * A Sidenav QP component.
 */
angular.module('material.components.sidenav', [
  'material.core',
  'material.services.registry',
  'material.animations'
])
  .factory('$materialSidenav', [
    '$materialComponentRegistry', 
    materialSidenavService 
  ])
  .directive('materialSidenav', [
    '$timeout',
    '$materialEffects',
    '$$rAF',
    '$materialConstant',
    materialSidenavDirective 
  ])
  .controller('$materialSidenavController', [
    '$scope',
    '$element',
    '$attrs',
    '$timeout',
    '$materialSidenav',
    '$materialComponentRegistry',
    materialSidenavController 
  ]);
  
/**
 * @private
 * @ngdoc object
 * @name materialSidenavController
 * @module material.components.sidenav
 *
 * @description
 * The controller for materialSidenav components.
 */
function materialSidenavController($scope, $element, $attrs, $timeout, $materialSidenav, $materialComponentRegistry) {

  var self = this;

  $materialComponentRegistry.register(this, $attrs.componentId);

  this.isOpen = function() {
    return !!$scope.isOpen;
  };

  /**
   * Toggle the side menu to open or close depending on its current state.
   */
  this.toggle = function() {
    $scope.isOpen = !$scope.isOpen;
  };

  /**
   * Open the side menu
   */
  this.open = function() {
    $scope.isOpen = true;
  };

  /**
   * Close the side menu
   */
  this.close = function() {
    $scope.isOpen = false;
  };
}

/**
 * @private
 * @ngdoc service
 * @name $materialSidenav
 * @module material.components.sidenav
 *
 * @description
 * $materialSidenav makes it easy to interact with multiple sidenavs
 * in an app.
 *
 * @usage
 *
 * ```javascript
 * // Toggle the given sidenav
 * $materialSidenav(componentId).toggle();
 *
 * // Open the given sidenav
 * $materialSidenav(componentId).open();
 *
 * // Close the given sidenav
 * $materialSidenav(componentId).close();
 * ```
 */
function materialSidenavService($materialComponentRegistry) {
  return function(handle) {
    var instance = $materialComponentRegistry.get(handle);
    if(!instance) {
      $materialComponentRegistry.notFoundError(handle);
    }

    return {
      isOpen: function() {
        if (!instance) { return; }
        return instance.isOpen();
      },
      /**
       * Toggle the given sidenav
       * @param handle the specific sidenav to toggle
       */
      toggle: function() {
        if(!instance) { return; }
        instance.toggle();
      },
      /**
       * Open the given sidenav
       * @param handle the specific sidenav to open
       */
      open: function(handle) {
        if(!instance) { return; }
        instance.open();
      },
      /**
       * Close the given sidenav
       * @param handle the specific sidenav to close
       */
      close: function(handle) {
        if(!instance) { return; }
        instance.close();
      }
    };
  };
}

/**
 * @ngdoc directive
 * @name materialSidenav
 * @module material.components.sidenav
 * @restrict E
 *
 * @description
 *
 * A Sidenav component that can be opened and closed programatically.
 *
 * When used properly with a layout, it will seamleslly stay open on medium
 * and larger screens, while being hidden by default on mobile devices.
 *
 * @usage
 * <hljs lang="html">
 * <div layout="horizontal" ng-controller="MyController">
 *   <material-sidenav component-id="left" class="material-sidenav-left">
 *     Left Nav!
 *   </material-sidenav>
 *
 *   <material-content>
 *     Center Content
 *     <material-button ng-click="openLeftMenu()">
 *       Open Left Menu
 *     </material-button>
 *   </material-content>
 *
 *   <material-sidenav component-id="right" class="material-sidenav-right">
 *     Right Nav!
 *   </material-sidenav>
 * </div>
 * </hljs>
 *
 * <hljs lang="js">
 * var app = angular.module('myApp', ['ngMaterial']);
 * app.controller('MainController', function($scope, $materialSidenav) {
 *   $scope.openLeftMenu = function() {
 *     $materialSidenav('left').toggle();
 *   };
 * });
 * </hljs>
 */
function materialSidenavDirective($timeout, $materialEffects, $$rAF, $materialConstant) {
  return {
    restrict: 'E',
    scope: {},
    controller: '$materialSidenavController',
    compile: compile
  };

  function compile(element, attr) {
    element.addClass('closed');

    return postLink;
  }
  function postLink(scope, element, attr, sidenavCtrl) {
    var backdrop = angular.element('<material-backdrop class="material-sidenav-backdrop">');

    scope.$watch('isOpen', onShowHideSide);
    element.on($materialEffects.TRANSITIONEND_EVENT, onTransitionEnd);

    /**
     * Toggle the SideNav view and attach/detach listeners
     * @param isOpen
     */
    function onShowHideSide(isOpen) {
      var parent = element.parent();

      if (isOpen) {
        element.removeClass('closed');

        parent.append(backdrop);
        backdrop.on('click', close);
        parent.on('keydown', onKeyDown);

      } else {
        backdrop.remove();
        backdrop.off('click', close);
        parent.off('keydown', onKeyDown);
      }

      // Wait until the next frame, so that if the `closed` class was just removed the 
      // element has a chance to 're-initialize' from being display: none.
      $$rAF(function() {
        element.toggleClass('open', !!scope.isOpen);
      });
    }

    function onTransitionEnd(ev) {
      if (ev.target === element[0] && !scope.isOpen) {
        element.addClass('closed');
      }
    }

    /**
     * Auto-close sideNav when the `escape` key is pressed.
     * @param evt
     */
    function onKeyDown(evt) {
      if(evt.which === $materialConstant.KEY_CODE.ESCAPE){
        close();

        evt.preventDefault();
        evt.stopPropagation();
      }
    }

    /**
     * With backdrop `clicks` or `escape` key-press, immediately
     * apply the CSS close transition... Then notify the controller
     * to close() and perform its own actions.
     */
    function close() {

      onShowHideSide( false );

      $timeout(function(){
        sidenavCtrl.close();
      });
    }

  }

}
