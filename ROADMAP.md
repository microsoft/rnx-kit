# The `rnx-kit` roadmap

> **Disclaimer**
>
> This document conveys what we (the maintainers of `rnx-kit`) want to achieve
> with it. Whether we have resources to fund all the efforts to reach these
> goals remains to be seen. As such, we make no guarantees on timelines or
> otherwise. It represents solely our stance on React Native and is not
> representative of the community as a whole.

## Motivation

The big draw of React Native is the promise of increased productivity with a
web-like development experience for native platforms, while maintaining a
seamless integration with the target platform, all for a little overhead over a
pure native solution. While it's true that it has brought things like the
ability to see your changes as you write the code and being able to share
business logic with web, the tools we use have not become any easier to work
with compared to the webdev experience. In fact, it has only become more complex
as we need to work with platform specific tools in addition to JS ones. This
complexity is what drives stakeholders towards alternatives despite what
performance numbers indicate.

## Our vision: bring the web's best developer experience to React Native

If we look at how to get started with web development, we can reduce the steps
down to the following:

1. Install a web browser
   - Edge and Safari ships with Windows and macOS, but people typically also
     install Chrome for its dev tools (although Edge ships the same nowadays).
2. Install Node
3. Run [`npm create vite@latest`][]
   - or equivalent generator command.

That's only three steps to get started! It can be further reduced if we consider
the use of virtual environments like [GitHub Codespaces][] which manage setting
up the tooling mostly automagically.

Web browsers include almost everything you might need, from the [standard
APIs][] that can be used to access audio, graphics, the file system, and many
others to development tools that are embedded directly right next to your app.
Web browsers essentially come with batteries included.

Let's compare that to how one would get started with React Native:

<table>
  <tbody valign="top">
    <tr>
      <th>&ZeroWidthSpace;</th>
      <th>Web</th>
      <th>React Native</th>
    </tr>
    <tr>
      <td>Requirements</td>
      <td>
        <ul>
          <li>Node</li>
          <li>A web browser</li>
        </ul>
      </td>
      <td>
        <ul>
          <li>Node</li>
          <li>
            Android
            <ul>
              <li>
                Android Studio
                <ul>
                  <li>Android SDK Platform</li>
                  <li>Android SDK Build-Tools</li>
                </ul>
              </li>
              <li>Java Development Kit</li>
            </ul>
          </li>
          <li>
            iOS and macOS
            <ul>
              <li>CocoaPods (and by extension, Ruby)</li>
              <li>Xcode</li>
            </ul>
          </li>
          <li>
            Windows
            <ul>
              <li>Visual Studio</li>
            </ul>
          </li>
        </ul>
        All these tools need to be on the correct versions or they may break
        randomly. See also
        <a
          href="https://github.com/microsoft/react-native-test-app/wiki#dependencies"
          >React Native Test App dependencies</a
        >.
      </td>
    </tr>
    <tr>
      <td>API</td>
      <td>
        <a href="https://developer.mozilla.org/en-US/docs/Web/API">Web APIs</a>
      </td>
      <td>
        A mix of community modules and whatever the individual host-apps
        provide. Most often, a feature team will have to detect the SDK
        available or make different bundles for every host-app they're
        targeting. They may also have to make invasive changes in the host-apps
        themselves.
      </td>
    </tr>
    <tr>
      <td>Debugging</td>
      <td>
        Depends on your browser choice.
        <a
          href="https://developer.chrome.com/blog/devtools-modern-web-debugging/"
          >Chrome DevTools</a
        >
        is a popular one.
      </td>
      <td>
        Depending on what you’re working with, you may find yourself having
        Android Studio, Xcode, and Chrome DevTools open at the same time to
        debug something from native to JS.
      </td>
    </tr>
  </tbody>
</table>

In many scenarios, a WebView is sufficient and will provide a "good enough"
experience to end users from a product perspective. This makes React Native,
with all its complexities, an expensive choice to make. It's not enough to talk
about performance numbers and great user experiences: we also need to court
developers with a great developer experience.

That's what we are setting as a north star goal for `rnx-kit`: to fill the gaps
and provide a set of tools to reduce this distance, bringing the web's best
developer experience to React Native.

In the next sections, we will outline what we are currently doing today and what
we need to invest into going forward.

## Our approach

### React Native's "web browser"

One of the reasons the web is easy to get started with is that you only need a
web browser. Practically all computers have one these days. Upgrading them is
also easy: just install the latest version. In most cases, this happens in the
background as long as your computer is on.

In contrast, when people start a new React Native project, it is only current at
that point in time. Every time a new version of React Native is released, they
will need to go through a very manual and time-consuming upgrade process. They
also need to make sure to keep up with latest Android SDK and Xcode releases.
For small teams, the cost may be prohibitive.

In order to level the playing field, we need one development client for all
React Native related needs across all platforms[^1]:

- Where possible, we need to provide a consistent and well-maintained
  development client that can be downloaded; for instance, from the platform's
  app store or as a downloadable executable.
- Where access to the native code or additional dependencies are required, we
  need to make it effortless to include additional modules and to change React
  Native versions (in both directions).

This effort predates `rnx-kit`, and we've achieved many of the things we've
aimed for with [`react-native-test-app`][], but still need the last push over
the finishing line.

For historical reasons, this work is in a separate repository:
https://github.com/microsoft/react-native-test-app. It is maintained by the very
same folks maintaining `rnx-kit`. It currently does not support/target web.

In the long term, we want `react-native-test-app` to be the best choice for
developers, whether they are working on a library or a standalone app.

> **Note**
>
> - For efforts towards making it easier to build, see
>   [Building native](#building-native).
>
> Other work we are aware of in this area:
>
> - Shopify created [Tophat][] to improve their inner dev loop by leveraging CI
>   and local tooling to allow seamless local testing of PR builds (iOS and
>   Android only).

### React Native Standard APIs

The piece of the browser puzzle missing from the above section is a standard
API. Today, web developers can reach out to Web APIs and assume that their app
will function across many platforms — that is not the case for React Native
developers. If the API you're looking for is not immediately available in
`react-native`, you will have to look for modules written by the community.
Maybe you'll find one in [React Native Directory][], or maybe you will have to
write one yourself. We want to shift the mindset from "what packages to use" to
"what APIs are available".

Standard APIs is what will make the "web browser" effort truly ubiquitous. We
cannot provide a complete downloadable app for development without this.

> **Note**
>
> - An RFC for this effort has been posted here:
>   https://github.com/microsoft/rnx-kit/pull/2504
> - This section only relates to the Web APIs. For the DOM counterpart of this
>   web convergence effort, please refer to the [React DOM For Native RFC][].

### Tooling

The "web browser" is only one part of the developer experience. Another
important aspect is all the tooling we need to support developers. This includes
dependency management, JS bundling, debugging, and everything in between. While
existing tools cover some of these things, we've also identified gaps:

#### Dependency management

What we see is that different teams manage dependencies in their own ways. There
is little consensus on what to use and what versions, leading to issues when
they try to get their features integrated into an app. [`@rnx-kit/align-deps`][]
tries to solve this by scanning dependencies and making sure the correct
packages and versions are being used based on opinionated built-in profiles, or
custom profiles provided by someone else. Its centralized design allows it to
align dependencies across many packages both within a repository and across
repositories.

#### JS bundling

Here we want to keep alignment with Meta and use [Metro][]. It is what Meta uses
internally and any improvements or features will come to Metro first. Any gaps
that we identify here should be fixed upstream first when feasible, and
otherwise fixed in our custom tooling.

It is imperative that we maintain a good partnership with the teams working on
Metro and [`@react-native-community/cli`][]. In the past, we drove dedicated
meetings with this goal in mind under the [Bundle Working Group][] effort. This
effort has now evolved into the Meta-owned [Metro Office Hours][].

#### Unified CLI

While we prefer to make improvements directly upstream, there are times when it
is not viable. A good example of this is tree shaking: introducing it in Metro
would require a re-architecture because the necessary changes are too invasive.
Instead, we chose to [write a plugin][] and a few minor changes to Metro to
enable it. This plugin currently requires a recent version of Metro (one that
ships with our patches), configuration of two different tools (Babel and Metro),
and logic to enable/disable some of the configuration based on the current mode.

This is all too much for users that just want to get started on their actual
work. With a custom CLI, we can abstract away complexities like this behind a
single flag. This is why wrapping a few extra features on top of the
[`@react-native-community/cli`][] in `rnx-kit` to tie all these things together
is important. If you look at the current [list of tools][], we're building up
quite a repertoire.

This solution is middle ground between upstreaming everything we can and
addressing our needs in a timely fashion.

### Building native

A downloadable dev client won't always fulfill all needs of a team. The learning
curve for acquiring the required knowledge to build a cross platform app is
steep. Developers need to work with all the tools for the platforms they're
targeting as shown in the comparison table from earlier. We need to figure out
how to reduce this complexity if we want to React Native as easy as web.

[`@rnx-kit/build`][] is building on an idea to use the cloud (e.g., GitHub
Actions or Azure Pipelines) to build the native apps and make them
downloadable/installable directly to a device. This means that developers no
longer need to maintain up-to-date installations of Android Studio, Xcode, or
any other tools than Node. This is essential to lowering the barrier to entry,
especially for teams that don't have much native experience or are looking to
increase developer agility by deploying virtual environments such as GitHub
Codespaces.

### Debugging

This is an area of React Native that historically has been unclear; however, we
have high hopes for great things coming out of the recently spun up [Debugging
Working Group][]. Ideally, the end result will provide tools similar (and
familiar in developer experience) to what web development already has available
with tooling such as [Chrome DevTools][].

## Our role in the broader community

It is hard to understate the importance of the React Native community in the
success of this technology. As stewards of `rnx-kit`, we want to be active
contributors in this community — not break or split it.

While our ecosystem-wide involvement has already been mentioned a few times
across this document, we wanted to reiterate it and underline how we are going
the extra mile to ensure that we are enabling everyone in the community to
leverage our findings and improvements, both via influencing the direction of
this technology and directly upstreaming what we can, and open sourcing tooling
here when we can't.

Our mantra for this effort is, to put simply, "a rising tide lifts all boats".

### Measuring success

As we execute on this roadmap, we will closely monitor data and metrics to
ensure our tools are delivering real improvements for React Native developers.
This includes looking at adoption rates, time savings achieved, and other
efficiency gains.

We also recognize the importance of community feedback. We will engage with
developers through GitHub discussions to collect ideas and feature requests.
This input will help us continue refining `rnx-kit` to best meet our goals.

<!-- Footnotes -->

[^1]:
    In the context of React Native native developer experience, "all platforms"
    is equivalent to Android, iOS, macOS, and Windows.

<!-- References -->

[`@react-native-community/cli`]: https://github.com/react-native-community/cli
[`@rnx-kit/align-deps`]:
  https://github.com/microsoft/rnx-kit/tree/main/packages/align-deps#readme
[`@rnx-kit/build`]:
  https://github.com/microsoft/rnx-kit/tree/main/incubator/build#readme
[`npm create vite@latest`]:
  https://vitejs.dev/guide/#scaffolding-your-first-vite-project
[`react-native-test-app`]: https://github.com/microsoft/react-native-test-app
[Bundle Working Group]:
  https://github.com/microsoft/rnx-kit/discussions/categories/bundle-working-group
[Chrome DevTools]: https://developer.chrome.com/docs/devtools/
[Debugging Working Group]:
  https://github.com/react-native-community/developer-experience-wg/discussions/categories/debugging
[GitHub Codespaces]: https://github.com/features/codespaces
[Metro]: https://facebook.github.io/metro/
[Metro Office Hours]:
  https://github.com/react-native-community/developer-experience-wg/discussions/categories/metro
[React DOM For Native RFC]:
  https://github.com/react-native-community/discussions-and-proposals/pull/496
[React Native Directory]: https://reactnative.directory/
[Tophat]: https://shopify.engineering/shopify-tophat-mobile-developer-testing
[list of tools]: https://microsoft.github.io/rnx-kit/docs/tools/overview
[standard APIs]: https://developer.mozilla.org/en-US/docs/Web/API
[write a plugin]:
  https://github.com/microsoft/rnx-kit/tree/main/packages/metro-serializer-esbuild#readme
