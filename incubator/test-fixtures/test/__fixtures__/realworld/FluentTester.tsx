import * as React from 'react';
import { ScrollView, View, Text as RNText, Platform, SafeAreaView, BackHandler, I18nManager } from 'react-native';

import { Separator, TextV1 as Text } from '@fluentui/react-native';
import { ButtonV1 as Button } from '@fluentui-react-native/button';
import { BASE_TESTPAGE, TESTPAGE_BUTTONS_SCROLLVIEWER, TESTPAGE_CONTENT_SCROLLVIEWER } from '@fluentui-react-native/e2e-testing';
import { ROOT_VIEW } from '@fluentui-react-native/e2e-testing';
import type { Theme } from '@fluentui-react-native/framework';
import { useTheme } from '@fluentui-react-native/theme-types';
import { themedStyleSheet } from '@fluentui-react-native/themed-stylesheet';

import { fluentTesterStyles, mobileStyles } from './TestComponents/Common/styles';
import { testProps } from './TestComponents/Common/TestProps';
import { tests } from './testPages';
import { ThemePickers } from './theme/ThemePickers';

// uncomment the below lines to enable message spy
/**
import MessageQueue from 'react-native/Libraries/BatchedBridge/MessageQueue';
MessageQueue.spy(true);
 */

export interface FluentTesterProps {
  enableSinglePaneView?: boolean;
}

interface HeaderProps {
  enableSinglePaneView?: boolean;
  enableBackButtonIOS?: boolean;
  onBackButtonPressedIOS?: () => void;
}

const getThemedStyles = themedStyleSheet((t: Theme) => {
  return {
    root: {
      backgroundColor: t.colors.neutralBackground1,
      flex: 1,
      flexGrow: 1,
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      padding: 4,
    },
    testSeparator: {
      borderColor: t.colors.menuDivider,
      borderWidth: 0.1,
    },
  };
});

const EmptyComponent: React.FunctionComponent = () => {
  return <RNText style={fluentTesterStyles.noTest}>Select a component from the test list.</RNText>;
};

const HeaderSeparator = Separator.customize((t) => ({
  color: t.colors.bodyFrameDivider,
  separatorWidth: 2,
}));

const TestListSeparator = Separator.customize((t) => ({
  color: t.colors.menuDivider,
  separatorWidth: 2,
}));

const Header: React.FunctionComponent<HeaderProps> = React.memo((props) => {
  const { enableSinglePaneView, enableBackButtonIOS, onBackButtonPressedIOS } = props;
  const theme = useTheme();

  const headerStyle = enableSinglePaneView ? fluentTesterStyles.headerWithBackButton : fluentTesterStyles.header;

  const backButtonTitle = I18nManager.isRTL ? 'Back ›' : '‹ Back';

  return (
    <View style={headerStyle}>
      <Text
        style={fluentTesterStyles.testHeader}
        variant="heroLargeSemibold"
        color={theme.host.palette?.TextEmphasis}
        /* For Android E2E testing purposes, testProps must be passed in after accessibilityLabel. */
        {...testProps(BASE_TESTPAGE)}
      >
        ⚛ FluentUI Tests
      </Text>
      <View style={fluentTesterStyles.header}>
        {/* On iPhone, We need a back button. Android has an OS back button, while desktop platforms have a two-pane view */}
        {Platform.OS === 'ios' && !Platform.isPad && (
          <Button
            appearance="subtle"
            style={fluentTesterStyles.backButton}
            onClick={onBackButtonPressedIOS}
            disabled={!enableBackButtonIOS}
          >
            {backButtonTitle}
          </Button>
        )}
        <ThemePickers />
      </View>
    </View>
  );
});

// filters and sorts tests alphabetically
const filteredTestComponents = tests.filter((test) => test.platforms.includes(Platform.OS as string));
const sortedTestComponents = filteredTestComponents.sort((a, b) => a.name.localeCompare(b.name));

export const FluentTester = (props: FluentTesterProps) => {
  const { enableSinglePaneView } = props;

  const [selectedTestIndex, setSelectedTestIndex] = React.useState(-1);
  const [onTestListView, setOnTestListView] = React.useState(true);
  const theme = useTheme();
  const themedStyles = getThemedStyles(theme);

  const removeBackHandler = React.useMemo(() => {
    return {
      remove: undefined,
    } as { remove?: () => void };
  }, []);

  const onBackPress = React.useCallback(() => {
    setOnTestListView(true);
    if (Platform.OS === 'android' && removeBackHandler.remove) {
      removeBackHandler.remove();
    }
    return true;
  }, []);

  const TestComponent = selectedTestIndex == -1 ? EmptyComponent : sortedTestComponents[selectedTestIndex].component;

  // This is used to initially bring focus to the app on win32
  const focusOnMountRef = React.useRef<View>(null);

  React.useEffect(() => {
    if (Platform.OS === ('win32' as any)) {
      focusOnMountRef.current?.focus();
    }
  }, []);

  const RootView = Platform.select({
    ios: SafeAreaView,
    default: View,
  });

  const isTestListVisible = !enableSinglePaneView || (enableSinglePaneView && onTestListView);
  const isTestSectionVisible = !enableSinglePaneView || (enableSinglePaneView && !onTestListView);

  const TestList = React.memo(() => {
    return (
      <View style={fluentTesterStyles.testList}>
        <ScrollView
          contentContainerStyle={fluentTesterStyles.testListContainerStyle}
          /* For Android E2E testing purposes, testProps must be passed in after accessibilityLabel. */
          {...testProps(TESTPAGE_BUTTONS_SCROLLVIEWER)}
        >
          {sortedTestComponents.map((description, index) => {
            return (
              <Button
                appearance="subtle"
                key={index}
                disabled={index == selectedTestIndex}
                onClick={() => setSelectedTestIndex(index)}
                style={fluentTesterStyles.testListItem}
                /* For Android E2E testing purposes, testProps must be passed in after accessibilityLabel. */
                {...testProps(description.testPageButton)}
                // This ref so focus can be set on it when the app mounts in win32. Without this, focus won't be set anywhere.
                {...(index === 0 && { componentRef: focusOnMountRef })}
              >
                {description.name}
              </Button>
            );
          })}
        </ScrollView>

        <TestListSeparator vertical style={fluentTesterStyles.testListSeparator} />
      </View>
    );
  });

  const MobileTestList = React.memo(() => {
    return (
      <View style={{ ...mobileStyles.testList, display: isTestListVisible ? 'flex' : 'none' }}>
        <ScrollView
          contentContainerStyle={fluentTesterStyles.testListContainerStyle}
          /* For Android E2E testing purposes, testProps must be passed in after accessibilityLabel. */
          {...testProps(TESTPAGE_BUTTONS_SCROLLVIEWER)}
        >
          {sortedTestComponents.map((description, index) => {
            return (
              <View key={index}>
                <Text
                  key={index}
                  onPress={() => {
                    setOnTestListView(false);
                    setSelectedTestIndex(index);
                    if (Platform.OS === 'android') {
                      // add the listener and remember the remove function so it can be cleaned up later
                      removeBackHandler.remove = BackHandler.addEventListener('hardwareBackPress', onBackPress).remove;
                    }
                  }}
                  style={mobileStyles.testListItem}
                  /* For Android E2E testing purposes, testProps must be passed in after accessibilityLabel. */
                  {...testProps(description.testPageButton)}
                >
                  {description.name}
                </Text>
                <Separator style={themedStyles.testSeparator} />
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  });

  const TestComponentView = () => {
    return (
      <ScrollView
        keyboardShouldPersistTaps="handled" // Prevents keyboard from dismissing when tapping on a text input
        contentContainerStyle={fluentTesterStyles.testSection}
        /* For Android E2E testing purposes, testProps must be passed in after accessibilityLabel. */
        {...testProps(TESTPAGE_CONTENT_SCROLLVIEWER)}
      >
        <TestComponent />
      </ScrollView>
    );
  };

  return (
    // On iOS, the accessible prop must be set to false because iOS does not support nested accessibility elements
    <RootView
      style={themedStyles.root}
      accessible={Platform.OS !== 'ios'}
      /* For Android E2E testing purposes, testProps must be passed in after accessibilityLabel. */
      {...testProps(ROOT_VIEW)}
    >
      <Header enableSinglePaneView={enableSinglePaneView} enableBackButtonIOS={!onTestListView} onBackButtonPressedIOS={onBackPress} />
      <HeaderSeparator />
      <View style={fluentTesterStyles.testRoot}>
        {enableSinglePaneView ? <MobileTestList /> : <TestList />}
        {isTestSectionVisible && <TestComponentView />}
      </View>
    </RootView>
  );
};
