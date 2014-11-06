/**
 * Copyright 2013-2014 Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactART
 */

"use strict";

require('art/modes/fast'); // Flip this to DOM mode for debugging

var Transform = require('art/core/transform');
var Mode = require('art/modes/current');

var React = require('react');
var ReactComponent = require('react/lib/ReactComponent');
var ReactMultiChild = require('react/lib/ReactMultiChild');
var ReactUpdates = require('react/lib/ReactUpdates');

var assign = require('react/lib/Object.assign');

var ReactComponentMixin = ReactComponent.Mixin;

// Used for comparison during mounting to avoid a lot of null checks
var BLANK_PROPS = {};

var pooledTransform = new Transform();

// Utilities

function childrenAsString(children) {
  if (!children) {
    return '';
  }
  if (typeof children === 'string') {
    return children;
  }
  if (children.length) {
    return children.join('\n');
  }
  return '';
}

function createComponent(name) {
  var ReactARTComponent = function(props) {
    // This constructor and it's argument is currently used by mocks.
  };
  ReactARTComponent.displayName = name;
  for (var i = 1, l = arguments.length; i < l; i++) {
    assign(ReactARTComponent.prototype, arguments[i]);
  }

  return ReactARTComponent;
}

// ContainerMixin for components that can hold ART nodes

var ContainerMixin = assign({}, ReactMultiChild.Mixin, {

  /**
   * Moves a child component to the supplied index.
   *
   * @param {ReactComponent} child Component to move.
   * @param {number} toIndex Destination index of the element.
   * @protected
   */
  moveChild: function(child, toIndex) {
    var childNode = child._mountImage;
    var mostRecentlyPlacedChild = this._mostRecentlyPlacedChild;
    if (mostRecentlyPlacedChild == null) {
      // I'm supposed to be first.
      if (childNode.previousSibling) {
        if (this.node.firstChild) {
          childNode.injectBefore(this.node.firstChild);
        } else {
          childNode.inject(this.node);
        }
      }
    } else {
      // I'm supposed to be after the previous one.
      if (mostRecentlyPlacedChild.nextSibling !== childNode) {
        if (mostRecentlyPlacedChild.nextSibling) {
          childNode.injectBefore(mostRecentlyPlacedChild.nextSibling);
        } else {
          childNode.inject(this.node);
        }
      }
    }
    this._mostRecentlyPlacedChild = childNode;
  },

  /**
   * Creates a child component.
   *
   * @param {ReactComponent} child Component to create.
   * @param {object} childNode ART node to insert.
   * @protected
   */
  createChild: function(child, childNode) {
    child._mountImage = childNode;
    var mostRecentlyPlacedChild = this._mostRecentlyPlacedChild;
    if (mostRecentlyPlacedChild == null) {
      // I'm supposed to be first.
      if (this.node.firstChild) {
        childNode.injectBefore(this.node.firstChild);
      } else {
        childNode.inject(this.node);
      }
    } else {
      // I'm supposed to be after the previous one.
      if (mostRecentlyPlacedChild.nextSibling) {
        childNode.injectBefore(mostRecentlyPlacedChild.nextSibling);
      } else {
        childNode.inject(this.node);
      }
    }
    this._mostRecentlyPlacedChild = childNode;
  },

  /**
   * Removes a child component.
   *
   * @param {ReactComponent} child Child to remove.
   * @protected
   */
  removeChild: function(child) {
    child._mountImage.eject();
    child._mountImage = null;
  },

  /**
   * Override to bypass batch updating because it is not necessary.
   *
   * @param {?object} nextChildren.
   * @param {ReactReconcileTransaction} transaction
   * @internal
   * @override {ReactMultiChild.Mixin.updateChildren}
   */
  updateChildren: function(nextChildren, transaction) {
    this._mostRecentlyPlacedChild = null;
    this._updateChildren(nextChildren, transaction);
  },

  // Shorthands

  mountAndInjectChildren: function(children, transaction) {
    var mountedImages = this.mountChildren(
      children,
      transaction
    );
    // Each mount image corresponds to one of the flattened children
    var i = 0;
    for (var key in this._renderedChildren) {
      if (this._renderedChildren.hasOwnProperty(key)) {
        var child = this._renderedChildren[key];
        child._mountImage = mountedImages[i];
        mountedImages[i].inject(this.node);
        i++;
      }
    }
  }

});

// Surface is a React DOM Component, not an ART component. It serves as the
// entry point into the ART reconciler.

var Surface = React.createClass({

  displayName: 'Surface',

  mixins: [ContainerMixin],

  componentDidMount: function() {
    var domNode = this.getDOMNode();

    this.node = Mode.Surface(+this.props.width, +this.props.height, domNode);

    var transaction = ReactUpdates.ReactReconcileTransaction.getPooled();
    transaction.perform(
      this.mountAndInjectChildren,
      this,
      this.props.children,
      transaction
    );
    ReactUpdates.ReactReconcileTransaction.release(transaction);
  },

  componentDidUpdate: function(oldProps) {
    var node = this.node;
    if (this.props.width != oldProps.width ||
        this.props.height != oldProps.height) {
      node.resize(+this.props.width, +this.props.height);
    }

    var transaction = ReactUpdates.ReactReconcileTransaction.getPooled();
    transaction.perform(
      this.updateChildren,
      this,
      this.props.children,
      transaction
    );
    ReactUpdates.ReactReconcileTransaction.release(transaction);

    if (node.render) {
      node.render();
    }
  },

  componentWillUnmount: function() {
    this.unmountChildren();
  },

  render: function() {
    // This is going to be a placeholder because we don't know what it will
    // actually resolve to because ART may render canvas, vml or svg tags here.
    // We only allow a subset of properties since others might conflict with
    // ART's properties.
    var props = this.props;

    // TODO: ART's Canvas Mode overrides surface title and cursor
    return (
      <Mode.Surface.tagName
        accesskey={props.accesskey}
        className={props.className}
        draggable={props.draggable}
        role={props.role}
        style={props.style}
        tabindex={props.tabindex}
        title={props.title}
      />
    );
  }

});

// Various nodes that can go into a surface

var EventTypes = {
  onMouseMove: 'mousemove',
  onMouseOver: 'mouseover',
  onMouseOut: 'mouseout',
  onMouseUp: 'mouseup',
  onMouseDown: 'mousedown',
  onClick: 'click'
};

var NodeMixin = assign({}, ReactComponentMixin, {

  putEventListener: function(type, listener) {
    var subscriptions = this.subscriptions || (this.subscriptions = {});
    var listeners = this.listeners || (this.listeners = {});
    listeners[type] = listener;
    if (listener) {
      if (!subscriptions[type]) {
        subscriptions[type] = this.node.subscribe(type, listener, this);
      }
    } else {
      if (subscriptions[type]) {
        subscriptions[type]();
        delete subscriptions[type];
      }
    }
  },

  handleEvent: function(event) {
    var listener = this.listeners[event.type];
    if (!listener) {
      return;
    }
    if (typeof listener === 'function') {
      listener.call(this, event);
    } else if (listener.handleEvent) {
      listener.handleEvent(event);
    }
  },

  destroyEventListeners: function() {
    var subscriptions = this.subscriptions;
    if (subscriptions) {
      for (var type in subscriptions) {
        subscriptions[type]();
      }
    }
    this.subscriptions = null;
    this.listeners = null;
  },

  applyNodeProps: function(oldProps, props) {
    var node = this.node;

    var scaleX = props.scaleX != null ? props.scaleX :
                 props.scale != null ? props.scale : 1;
    var scaleY = props.scaleY != null ? props.scaleY :
                 props.scale != null ? props.scale : 1;

    pooledTransform
      .transformTo(1, 0, 0, 1, 0, 0)
      .move(props.x || 0, props.y || 0)
      .rotate(props.rotation || 0, props.originX, props.originY)
      .scale(scaleX, scaleY, props.originX, props.originY);

    if (props.transform != null) {
      pooledTransform.transform(props.transform);
    }

    if (node.xx !== pooledTransform.xx || node.yx !== pooledTransform.yx ||
        node.xy !== pooledTransform.xy || node.yy !== pooledTransform.yy ||
        node.x  !== pooledTransform.x  || node.y  !== pooledTransform.y) {
      node.transformTo(pooledTransform);
    }

    if (props.cursor !== oldProps.cursor || props.title !== oldProps.title) {
      node.indicate(props.cursor, props.title);
    }

    if (node.blend && props.opacity !== oldProps.opacity) {
      node.blend(props.opacity == null ? 1 : props.opacity);
    }

    if (props.visible !== oldProps.visible) {
      if (props.visible == null || props.visible) {
        node.show();
      } else {
        node.hide();
      }
    }

    for (var type in EventTypes) {
      this.putEventListener(EventTypes[type], props[type]);
    }
  },

  mountComponentIntoNode: function(rootID, container) {
    throw new Error(
      'You cannot render an ART component standalone. ' +
      'You need to wrap it in a Surface.'
    );
  }

});

// Group

var Group = createComponent('Group', NodeMixin, ContainerMixin, {

  mountComponent: function(rootID, transaction, mountDepth) {
    ReactComponentMixin.mountComponent.apply(this, arguments);
    this.node = Mode.Group();
    this.applyGroupProps(BLANK_PROPS, this.props);
    this.mountAndInjectChildren(this.props.children, transaction);
    return this.node;
  },

  receiveComponent: function(nextComponent, transaction) {
    var props = nextComponent.props;
    this.applyGroupProps(this.props, props);
    this.updateChildren(props.children, transaction);
    this.props = props;
  },

  applyGroupProps: function(oldProps, props) {
    this.node.width = props.width;
    this.node.height = props.height;
    this.applyNodeProps(oldProps, props);
  },

  unmountComponent: function() {
    this.destroyEventListeners();
    this.unmountChildren();
  }

});

// ClippingRectangle
var ClippingRectangle = createComponent(
    'ClippingRectangle', NodeMixin, ContainerMixin, {

  mountComponent: function(rootID, transaction, mountDepth) {
    ReactComponentMixin.mountComponent.apply(this, arguments);
    this.node = Mode.ClippingRectangle();
    this.applyClippingProps(BLANK_PROPS, this.props);
    this.mountAndInjectChildren(this.props.children, transaction);
    return this.node;
  },

  receiveComponent: function(nextComponent, transaction) {
    var props = nextComponent.props;
    this.applyClippingProps(this.props, props);
    this.updateChildren(props.children, transaction);
    this.props = props;
  },

  applyClippingProps: function(oldProps, props) {
    this.node.width = props.width;
    this.node.height = props.height;
    this.node.x = props.x;
    this.node.y = props.y;
    this.applyNodeProps(oldProps, props);
  },

  unmountComponent: function() {
    this.destroyEventListeners();
    this.unmountChildren();
  }

});


// Renderables

var RenderableMixin = assign({}, NodeMixin, {

  applyRenderableProps: function(oldProps, props) {
    if (oldProps.fill !== props.fill) {
      if (props.fill && props.fill.applyFill) {
        props.fill.applyFill(this.node);
      } else {
        this.node.fill(props.fill);
      }
    }
    if (
      oldProps.stroke !== props.stroke ||
      oldProps.strokeWidth !== props.strokeWidth ||
      oldProps.strokeCap !== props.strokeCap ||
      oldProps.strokeJoin !== props.strokeJoin ||
      // TODO: Consider a deep check of stokeDash.
      // This may benefit the VML version in IE.
      oldProps.strokeDash !== props.strokeDash
    ) {
      this.node.stroke(
        props.stroke,
        props.strokeWidth,
        props.strokeCap,
        props.strokeJoin,
        props.strokeDash
      );
    }
    this.applyNodeProps(oldProps, props);
  },

  unmountComponent: function() {
    this.destroyEventListeners();
  }

});

// Shape

var Shape = createComponent('Shape', RenderableMixin, {

  mountComponent: function() {
    ReactComponentMixin.mountComponent.apply(this, arguments);
    this.node = Mode.Shape();
    this.applyShapeProps(BLANK_PROPS, this.props);
    return this.node;
  },

  receiveComponent: function(nextComponent, transaction) {
    var props = nextComponent.props;
    this.applyShapeProps(this.props, props);
    this.props = props;
  },

  applyShapeProps: function(oldProps, props) {
    var oldPath = this._oldPath;
    var path = props.d || childrenAsString(props.children);
    if (path !== oldPath ||
        oldProps.width !== props.width ||
        oldProps.height !== props.height) {
      this.node.draw(
        path,
        props.width,
        props.height
      );
      this._oldPath = path;
    }
    this.applyRenderableProps(oldProps, props);
  }

});

// Text

var Text = createComponent('Text', RenderableMixin, {

  mountComponent: function() {
    ReactComponentMixin.mountComponent.apply(this, arguments);
    var props = this.props;
    var newString = childrenAsString(props.children);
    this.node = Mode.Text(newString, props.font, props.alignment, props.path);
    this._oldString = newString;
    this.applyRenderableProps(BLANK_PROPS, this.props);
    return this.node;
  },

  isSameFont: function(oldFont, newFont) {
    if (oldFont === newFont) {
      return true;
    }
    if (typeof newFont === 'string' || typeof oldFont === 'string') {
      return false;
    }
    return (
      newFont.fontSize === oldFont.fontSize &&
      newFont.fontStyle === oldFont.fontStyle &&
      newFont.fontVariant === oldFont.fontVariant &&
      newFont.fontWeight === oldFont.fontWeight &&
      newFont.fontFamily === oldFont.fontFamily
    );
  },

  receiveComponent: function(nextComponent, transaction) {
    var props = nextComponent.props;
    var oldProps = this.props;

    var oldString = this._oldString;
    var newString = childrenAsString(props.children);

    if (oldString !== newString ||
        !this.isSameFont(oldProps.font, props.font) ||
        oldProps.alignment !== props.alignment ||
        oldProps.path !== props.path) {
      this.node.draw(
        newString,
        props.font,
        props.alignment,
        props.path
      );
      this._oldString = newString;
    }

    this.applyRenderableProps(oldProps, props);
    this.props = props;
  }

});

// Declarative fill type objects - API design not finalized

var slice = Array.prototype.slice;

function LinearGradient(stops, x1, y1, x2, y2) {
  this.args = slice.call(arguments);
};
LinearGradient.prototype.applyFill = function(node) {
  node.fillLinear.apply(node, this.args);
};

function RadialGradient(stops, fx, fy, rx, ry, cx, cy) {
  this.args = slice.call(arguments);
};
RadialGradient.prototype.applyFill = function(node) {
  node.fillRadial.apply(node, this.args);
};

function Pattern(url, width, height, left, top) {
  this.args = slice.call(arguments);
};
Pattern.prototype.applyFill = function(node) {
  node.fillImage.apply(node, this.args);
};

var ReactART = {

  LinearGradient: LinearGradient,
  RadialGradient: RadialGradient,
  Pattern: Pattern,
  Transform: Transform,
  Path: Mode.Path,
  Surface: Surface,
  Group: Group,
  ClippingRectangle: ClippingRectangle,
  Shape: Shape,
  Text: Text

};

module.exports = ReactART;
