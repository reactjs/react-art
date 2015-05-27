/**
 * Copyright 2013-2014 Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails react-core
 */

/*jslint evil: true */

"use strict";

require('mock-modules')
  .dontMock('ReactART');

var React;
var ReactTestUtils;

var Group;
var Shape;
var Surface;
var TestComponent;

var Missing = {};

function testDOMNodeStructure(domNode, expectedStructure) {
  expect(domNode).toBeDefined();
  expect(domNode.nodeName).toBe(expectedStructure.nodeName);
  for (var prop in expectedStructure) {
    if (!expectedStructure.hasOwnProperty(prop)) continue;
    if (prop != 'nodeName' && prop != 'children') {
      if (expectedStructure[prop] === Missing) {
        expect(domNode.hasAttribute(prop)).toBe(false);
      } else {
        expect(domNode.getAttribute(prop)).toBe(expectedStructure[prop]);
      }
    }
  }
  if (expectedStructure.children) {
    expectedStructure.children.forEach(function(subTree, index) {
      testDOMNodeStructure(domNode.childNodes[index], subTree);
    });
  }
}

describe('ReactART', function() {

  beforeEach(function() {
    React = require('react');
    ReactTestUtils = require('react/lib/ReactTestUtils');

    var ReactART = require('ReactART');
    var ARTSVGMode = require('art/modes/svg');
    var ARTCurrentMode = require('art/modes/current');

    ARTCurrentMode.setCurrent(ARTSVGMode);

    Group = ReactART.Group;
    Shape = ReactART.Shape;
    Surface = ReactART.Surface;

    TestComponent = React.createClass({

      render: function() {

        var a =
          <Shape
            d="M0,0l50,0l0,50l-50,0z"
            fill={new ReactART.LinearGradient(["black", "white"])}
            key="a"
            width={50} height={50}
            x={50} y={50}
            opacity={0.1}
          />;

        var b =
          <Shape
            fill="#3C5A99"
            key="b"
            scale={0.5}
            x={50} y={50}
            title="This is an F"
            cursor="pointer">
            M64.564,38.583H54l0.008-5.834c0-3.035,0.293-4.666,4.657-4.666
            h5.833V16.429h-9.33c-11.213,0-15.159,5.654-15.159,15.16v6.994
            h-6.99v11.652h6.99v33.815H54V50.235h9.331L64.564,38.583z
          </Shape>;

        var c = <Group key="c" />;

        return (
          <Surface width={150} height={200}>
            <Group ref="group">
              {this.props.flipped ? [b, a, c] : [a, b, c]}
            </Group>
          </Surface>
        );
      }
    });

  });

  it('should have the correct lifecycle state', function() {
    var instance = <TestComponent />;
    instance = ReactTestUtils.renderIntoDocument(instance);
    var group = instance.refs.group;
    // Duck type test for an ART group
    expect(typeof group.indicate).toBe('function');
  });

  it('should render a reasonable SVG structure in SVG mode', function() {
    var instance = <TestComponent />;
    instance = ReactTestUtils.renderIntoDocument(instance);

    var expectedStructure = {
      nodeName: 'SVG',
      width: '150',
      height: '200',
      children: [
        { nodeName: 'DEFS' },
        {
          nodeName: 'G',
          children: [
            {
              nodeName: 'DEFS',
              children: [
                { nodeName: 'LINEARGRADIENT' }
              ]
            },
            { nodeName: 'PATH' },
            { nodeName: 'PATH' },
            { nodeName: 'G' }
          ]
        }
      ]
    };

    var realNode = instance.getDOMNode();
    testDOMNodeStructure(realNode, expectedStructure);
  });

  it('should be able to reorder components', function() {
    var instance = <TestComponent flipped={false} />;
    instance = ReactTestUtils.renderIntoDocument(instance);

    var expectedStructure = {
      nodeName: 'SVG',
      children: [
        { nodeName: 'DEFS' },
        {
          nodeName: 'G',
          children: [
            { nodeName: 'DEFS' },
            { nodeName: 'PATH', opacity: '0.1' },
            { nodeName: 'PATH', opacity: Missing },
            { nodeName: 'G' }
          ]
        }
      ]
    };

    var realNode = instance.getDOMNode();
    testDOMNodeStructure(realNode, expectedStructure);

    instance.setProps({ flipped: true });

    var expectedNewStructure = {
      nodeName: 'SVG',
      children: [
        { nodeName: 'DEFS' },
        {
          nodeName: 'G',
          children: [
            { nodeName: 'DEFS' },
            { nodeName: 'PATH', opacity: Missing },
            { nodeName: 'PATH', opacity: '0.1' },
            { nodeName: 'G' }
          ]
        }
      ]
    };

    testDOMNodeStructure(realNode, expectedNewStructure);
  });

  it('renders composite with lifecycle inside group', function() {
    var mounted = false;
    var CustomShape = React.createClass({
      render: function() {
        return <Shape />;
      },
      componentDidMount: function() {
        mounted = true;
      }
    });
    ReactTestUtils.renderIntoDocument(
      <Surface>
        <Group>
          <CustomShape />
        </Group>
      </Surface>
    );
    expect(mounted).toBe(true);
  });

  it('resolves refs before componentDidMount', function() {
    var CustomShape = React.createClass({
      render: function() {
        return <Shape />;
      }
    });
    var ref = null;
    var Outer = React.createClass({
      componentDidMount: function() {
        ref = this.refs.test;
      },
      render: function() {
        return (
          <Surface>
            <Group>
              <CustomShape ref="test" />
            </Group>
          </Surface>
        );
      }
    });
    ReactTestUtils.renderIntoDocument(<Outer />);
    expect(ref.constructor).toBe(CustomShape);
  });

  it('resolves refs before componentDidUpdate', function() {
    var CustomShape = React.createClass({
      render: function() {
        return <Shape />;
      }
    });
    var ref = {};
    var Outer = React.createClass({
      componentDidMount: function() {
        ref = this.refs.test;
      },
      componentDidUpdate: function() {
        ref = this.refs.test;
      },
      render: function() {
        return (
          <Surface>
            <Group>
              {this.props.mountCustomShape && <CustomShape ref="test" />}
            </Group>
          </Surface>
        );
      }
    });
    var container = document.createElement('div');
    React.render(<Outer />, container);
    expect(ref).not.toBeDefined();
    React.render(<Outer mountCustomShape={true} />, container);
    expect(ref.constructor).toBe(CustomShape);
  });

});
