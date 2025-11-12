/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import React, { Component } from 'react';
import { NewAppScreen } from '@react-native/new-app-screen';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { PorcupineManager } from '@picovoice/porcupine-react-native';

type Props = {};

type State = {
  buttonText: string;
  buttonDisabled: boolean;
  isListening: boolean;
  backgroundColour: string;
  isError: boolean;
  errorMessage: string | null;
};

export default class App extends Component<Props, State> {
  _porcupineManager: PorcupineManager | undefined;
  _detectionColour: string = '#00E5C3';
  _defaultColour: string = '#F5FCFF';

  constructor(props: Props) {
    super(props);
    this.state = {
      buttonText: 'Start',
      buttonDisabled: false,
      isListening: false,
      backgroundColour: this._defaultColour,
      isError: false,
      errorMessage: null,
    };
  }
  render() {
    const isDarkMode = true;

    return (
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <this.AppContent />
        <this.WakeWordDetector />
      </SafeAreaProvider>
    );
  }

  async _startProcessing() {
    this.setState({
      buttonDisabled: true,
    });

    try {
      await this._porcupineManager?.start();
      this.setState({
        buttonText: 'Stop',
        buttonDisabled: false,
        isListening: true,
      });
    } catch (e: any) {
      this.setState({
        isError: true,
        errorMessage: e.message,
      });
    }
  }

  async _stopProcessing() {
    this.setState({
      buttonDisabled: true,
    });

    try {
      await this._porcupineManager?.stop();
      this.setState({
        buttonText: 'Start',
        buttonDisabled: false,
        isListening: false,
      });
    } catch (e: any) {
      this.setState({
        isError: true,
        errorMessage: e.message,
      });
    }
  }

  async _toggleListening() {
    if (this.state.isListening) {
      await this._stopProcessing();
    } else {
      await this._startProcessing();
    }
  }

  async WakeWordDetector() {
    const detectionCallback = (keywordIndex: number) => {
      if (keywordIndex >= 0) {
        console.log('Keyword Index', keywordIndex);
      }
      this.setState({
        backgroundColour: this._detectionColour,
      });

      setTimeout(() => {
        this.setState({
          backgroundColour: this._defaultColour,
        });
      }, 1000);
    };

    this._porcupineManager = await PorcupineManager.fromKeywordPaths(
      'Ij9pycmwUTE5CnpV+d8hKkl9Dgur52aHgyh+QbG/6uv4Y9/g9HPu2g==',
      ['./android/app/src/main/assets/.'],
      detectionCallback,
    );
    return (
      <View style={styles.button}>
        <TouchableOpacity
          style={styles.buttonStyle}
          onPress={() => this._toggleListening()}
          disabled={this.state.buttonDisabled || this.state.isError}
        >
          <Text style={styles.buttonText}>{this.state.buttonText}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  AppContent() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const safeAreaInsets = useSafeAreaInsets();

    return (
      <View style={styles.container}>
        <NewAppScreen
          templateFileName="App.tsx"
          safeAreaInsets={safeAreaInsets}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignContent: 'center',
  },
  buttonStyle: {
    width: '50%',
    height: '50%',
    alignSelf: 'center',
    justifyContent: 'center',
    backgroundColor: '#377DFF',
    borderRadius: 100,
  },
  buttonText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
});
