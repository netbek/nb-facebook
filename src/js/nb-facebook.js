/**
 * AngularJS service for Facebook
 *
 * @author Hein Bekker <hein@netbek.co.za>
 * @copyright (c) 2015 Hein Bekker
 * @license http://www.gnu.org/licenses/agpl-3.0.txt AGPLv3
 */

(function (window, angular, undefined) {
	'use strict';

	angular
		.module('nb.facebook', [
			'nb.analytics'
		])
		.provider('nbFacebookConfig', nbFacebookConfig)
		.service('nbFacebook', nbFacebook);

	function nbFacebookConfig () {
		var config = {
			appId: undefined, // {String} Application ID. This is a required parameter.
			version: 'v2.2', // {String} Determines which versions of the Graph API and any API dialogs or plugins are invoked when using the .api() and .ui() functions. Valid values are determined by currently available versions, such as 'v2.0'. This is a required parameter.
			cookie: false, // {Boolean} Determines whether a cookie is created for the session or not. If enabled, it can be accessed by server-side code. Defaults to false.
			status: false, // {Boolean} Determines whether the current login status of the user is freshly retrieved on every page load. If this is disabled, that status will have to be manually retrieved using .getLoginStatus(). Defaults to false.
			xfbml: false, // {Boolean} Determines whether XFBML tags used by social plugins are parsed, and therefore whether the plugins are rendered or not. Defaults to false.
			frictionlessRequests: false, // {Boolean} Frictionless Requests are available to games on Facebook.com or on mobile web using the JavaScript SDK. This parameter determines whether they are enabled. Defaults to false.
			hideFlashCallback: null, // {Function} This specifies a function that is called whenever it is necessary to hide Adobe Flash objects on a page. This is used when .api() requests are made, as Flash objects will always have a higher z-index than any other DOM element. See our Custom Flash Hide Callback for more details on what to put in this function. Defaults to null.
			locale: 'en_US', // {String}
			canvas: {
				width: undefined, // {Number}
				height: undefined // {Number}
			},
			trackEvents: {} // {Object} Events to track {'facebookEvent': 'analyticsAction'}
		};
		return {
			set: function (values) {
				_.merge(config, values);
			},
			$get: function () {
				return config;
			}
		};
	}

	nbFacebook.$inject = ['$rootScope', '$window', '$q', '$timeout', 'nbFacebookConfig', 'nbAnalytics'];
	function nbFacebook ($rootScope, $window, $q, $timeout, nbFacebookConfig, nbAnalytics) {
		/* jshint validthis: true */
		var self = this;
		var flags = {
			initialized: false, // Whether init() has been executed.
			ready: false
		};
		var deferredInit;

		/**
		 *
		 * https://developers.facebook.com/docs/javascript/reference/FB.init/v2.2
		 *
		 * @returns {Promise}
		 */
		this.init = function () {
			if (!flags.initialized) {
				flags.initialized = true;

				deferredInit = $q.defer();

				$window.fbAsyncInit = function () {
					window.FB.init({
						appId: nbFacebookConfig.appId,
						version: nbFacebookConfig.version,
						cookie: nbFacebookConfig.cookie,
						status: nbFacebookConfig.status,
						xfbml: nbFacebookConfig.xfbml,
						frictionlessRequests: nbFacebookConfig.frictionlessRequests,
						hideFlashCallback: nbFacebookConfig.hideFlashCallback
					});

					// Set the initial canvas size.
					if (angular.isDefined(nbFacebookConfig.canvas.width) && angular.isDefined(nbFacebookConfig.canvas.height)) {
						window.FB.Canvas.setSize({
							'width': nbFacebookConfig.canvas.width,
							'height': nbFacebookConfig.canvas.height
						});
					}

					// Set up event tracking.
					// https://developers.facebook.com/docs/reference/javascript/FB.Event.subscribe/v2.2
					angular.forEach(nbFacebookConfig.trackEvents, function (action, event) {
						window.FB.Event.subscribe(event, function (url) {
							nbAnalytics.trackSocial('facebook', action, url);
						});
					});

					flags.ready = true;
					deferredInit.resolve(window.FB);
				};

				// Inject Facebook root element.
				var id = 'fb-root';
				var fbroot = document.getElementById(id);
				if (!fbroot) {
					fbroot = document.createElement('div');
					fbroot.id = id;
					document.body.insertBefore(fbroot, document.body.childNodes[0]);
				}

				// Inject SDK script element.
				id = 'facebook-jssdk';
				var js = document.getElementById(id);
				if (js) {
					// @todo If there's already a script with this ID...
				}
				else {
					var src = '//connect.facebook.net/' + nbFacebookConfig.locale + '/sdk.js';
					js = document.createElement('script');
					js.id = id;
					js.async = true;
					js.src = src;
					var fjs = document.getElementsByTagName('script')[0];
					fjs.parentNode.insertBefore(js, fjs);
				}
			}

			return deferredInit.promise;
		};

		/**
		 * Prompts the user to authenticate the application using login dialog.
		 * https://developers.facebook.com/docs/reference/javascript/FB.login/v2.2
		 *
		 * @param {Object} params
		 * @returns {Promise}
		 */
		this.login = function (params) {
			return self.init()
				.then(function () {
					var d = $q.defer();

					window.FB.login(function (response) {
						if (!response || response.error || !response.authResponse) {
							d.reject(response);
						}
						else {
							d.resolve(response);
						}
//						$rootScope.$apply();
					}, params);

					return d.promise;
				});
		};

		/**
		 * Calls the Graph API.
		 * https://developers.facebook.com/docs/javascript/reference/FB.api
		 *
		 * @param {String} path
		 * @param {String} method `get`, `post`, `delete`
		 * @param {Object} params
		 * @returns {Promise}
		 */
		this.api = function (path, method, params) {
			return self.init()
				.then(function () {
					var d = $q.defer();

					window.FB.api(path, method, params, function (response) {
						if (!response || response.error) {
							d.reject(response);
						}
						else {
							d.resolve(response);
						}
//						$rootScope.$apply();
					}, params);

					return d.promise;
				});
		};

		/**
		 * Triggers different forms of Facebook created UI dialogs.
		 * https://developers.facebook.com/docs/javascript/reference/FB.ui/
		 *
		 * @param {Object} args
		 * @returns {Promise}
		 */
		this.ui = function (args) {
			return self.init()
				.then(function () {
					var d = $q.defer();

					window.FB.ui(args, function (response) {
						if (!response || response.error) {
							d.reject(response);
						}
						else {
							d.resolve(response);
						}
//						$rootScope.$apply();
					});

					return d.promise;
				});
		};

		/**
		 * Tells Facebook to resize the iframe.
		 * https://developers.facebook.com/docs/reference/javascript/FB.Canvas.setSize
		 *
		 * @param {Number} width
		 * @param {Number} height
		 * @returns {Promise}
		 */
		this.canvasSetSize = function (width, height) {
			return self.init()
				.then(function () {
					var d = $q.defer();

					var args;
					if (angular.isDefined(width) && angular.isDefined(height)) {
						args = {
							'width': width,
							'height': height
						};
					}
					window.FB.Canvas.setSize(args);

					d.resolve(true);

					return d.promise;
				});
		};
	}
})(window, window.angular);
