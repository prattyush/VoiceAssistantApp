//
// Copyright 2020-2025 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import React, { Component,} from 'react';
import {Platform, StyleSheet, Text, TouchableOpacity, View, Alert, TextInput,} from 'react-native';
import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  AVEncoderAudioQualityIOSType,
} from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/FontAwesome';
import InAppBrowser from 'react-native-inappbrowser-reborn';

type Props = {};
type State = {
  buttonText: string;
  playerButtonText: string;
  uploadButtonText: string;
  commandButtonText: string;
    nextLinkButtonText: string;
  buttonDisabled: boolean;
  isListening: boolean;
  isError: boolean;
  errorMessage: string | null;
  iframeSource: string| null;
  loading: boolean | false;
  links: string[] | [];
  currentLinksIndex: number;
  nextButtonDisabled: boolean | false;
};

let count = 0;
let recordedFileName = '';
let recordedFileUri = '';
let commandOutput = '';
let commandText = "";

const getAudioPath = (fileName: string) => {
  if (Platform.OS === 'android') {
    // Save in app-specific cache directory
    return `${RNFS.CachesDirectoryPath}/${fileName}`;
  }
  // iOS path handling can be different
  return fileName;
};

const audioRecorderPlayer = AudioRecorderPlayer;
export default class App extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      buttonText: 'Start',
      playerButtonText: 'AudioPlay',
      uploadButtonText: 'Upload',
      commandButtonText: 'Command',
        nextLinkButtonText: 'Next',
      buttonDisabled: false,
      isListening: false,
      isError: false,
      errorMessage: null,
        iframeSource: null,
        loading: false,
        links: [],
        currentLinksIndex: 0,
        nextButtonDisabled: false,
    };
  }

  async componentDidMount() {}

  async componentWillUnmount() {}

  async _startProcessing() {
    this.setState({
      buttonDisabled: true,
    });

    try {
      count = count + 1;
      recordedFileName = 'recorded_audio' + '_' + 0 + '.m4a';
      const path = getAudioPath(recordedFileName); // Use .m4a for better compression by default
      // For WAV, try 'recorded_audio.wav' in the path, but know the actual format might be different

      const audioSet = {
        AudioEncoderAndroid: AudioEncoderAndroidType.AAC, // AAC is standard for Android
        AudioSourceAndroid: AudioSourceAndroidType.MIC,
        AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
        AVNumberOfChannelsKeyIOS: 2,
      };

      recordedFileUri = await audioRecorderPlayer.startRecorder(path, audioSet);
      console.log(`Recording started at: ${recordedFileUri}`);
      // Add record back listener to get current position for UI updates

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

      console.error('Failed to start Recording', e);
    }
  }

  async uploadFile(fileUri = recordedFileUri) {
    const formData = new FormData();

    // Adjust file info depending on platform; for Android typically content URI or file path
    formData.append('file', {
      uri: fileUri,
      type: 'audio/m4a', // Adjust depending on your file type
      name: 'recorded_command.m4a',
    });

    try {
      const response = await fetch('http://192.168.1.8:9018/uploadaudio/', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const result = await response.json(); // or response.text()
      console.log('Upload response:', result);
      commandOutput = result.text;
      console.log('Command Parsed :', commandOutput);
    } catch (error) {
      console.error('Upload error:', error);
    }
  }

  async setCommandText (text: string) {
      commandText = commandText + text;
      console.log(commandText);
  }

  async nextLink() {
      const tempIndex = this.state.currentLinksIndex + 1;
      console.log(this.state.currentLinksIndex);
      this.setState({currentLinksIndex: tempIndex})
      console.log(this.state.currentLinksIndex);
      console.log(this.state.links.length);
      console.log(this.state.links);
      if (this.state.currentLinksIndex < this.state.links.length) {
          console.log(this.state.currentLinksIndex);
          console.log(this.state.links[this.state.currentLinksIndex]);
        this.setState({
          iframeSource: this.state.links[this.state.currentLinksIndex],
          loading: false,
        });
        await this.openWebsite(this.state.links[this.state.currentLinksIndex]);
      } else {
          this.setState({nextButtonDisabled: true});
      }
  }

     extractAndOpenLink (text:string) {
        const urlRegex = /(https?:\/\/[^\s]+)/g; // Matches http or https URLs
        const matches = text.match(urlRegex);

        if (matches && matches.length > 0) {
            const firstLink = matches[0];
            console.log("Got Link == " + firstLink);
            return matches[0];
        } else {
            console.log('No link found in the text. ' + text);
        }
        return null;
    };

  async commandOutput() {
      this.setState({ loading: true });
      //const testCommand = "Can you give links for latest indian tech news"
      //const testUrl = "https://www.reuters.com/sustainability/climate-energy/nvidia-joins-india-deep-tech-alliance-group-adds-new-members-850-million-pledge-2025-11-05/"
    try {
      const response = await fetch(
        'http://192.168.1.8:9018/command/' + commandOutput,
        {
          method: 'GET',
        },
      );

      const result = await response.json();
        const resultJson = JSON.parse(result.toString())
        this.setState({links:[]})
        for (const linkObject of resultJson.links_list) {
            this.state.links.push(linkObject.link);
        }
        this.setState({currentLinksIndex: 0})
        this.setState({nextButtonDisabled: false});
        console.log(this.state.links);
        console.log(this.state.links[this.state.currentLinksIndex]);

        console.log(resultJson.links_list[0].link)
        this.setState({iframeSource: this.state.links[this.state.currentLinksIndex], loading:false})
        await this.openWebsite(this.state.links[this.state.currentLinksIndex])
      console.log('Command response:', resultJson);
        const responseLinksList = [];
        for (const linkObject of resultJson.links_list) {
            responseLinksList.push(linkObject.link);
        }
        this.setState({links:responseLinksList})

        console.log(this.state.links);
    } catch (error) {
      console.error('Upload error:', error);
    }
  }

  async _stopProcessing() {
    this.setState({
      buttonDisabled: true,
    });

    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      console.log(`Recording stopped. File saved at: ${result}`);

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

      console.error('Failed to stop recording', e);
    }
  }

  async onStartPlay() {
    const path = getAudioPath(recordedFileName);
    console.log('Starting playback from:', path);

    try {
      const msg = await audioRecorderPlayer.startPlayer(path);
      console.log(msg);
      await audioRecorderPlayer.setVolume(1.0); // Set volume to 100%

      // Add a listener to track playback progress or completion
      audioRecorderPlayer.addPlayBackListener(e => {
        // e.current_position and e.duration are available for progress bars/timers
        if (e.currentPosition === e.duration) {
          console.log('finished playing');
          audioRecorderPlayer.stopPlayer();
          audioRecorderPlayer.removePlayBackListener(); // Important for memory management
        }
        // You can update your component's state here to show playback time
      });
    } catch (err) {
      console.error('Failed to start playback', err);
    }
  }
  async _toggleListening() {
    if (this.state.isListening) {
      await this._stopProcessing();
    } else {
      await this._startProcessing();
    }
  }

  async _playAudio() {
    await this.onStartPlay();
  }

    async  openWebsite (link: string) {
      const url = this.extractAndOpenLink(link);
      console.log(url);
        try {
            // Validate URL
            if (!url || url.trim() === '') {
                Alert.alert('Error', 'Please enter a URL');
                return;
            }

            // Add https:// if not present
            let formattedUrl = url;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                formattedUrl = 'https://' + url;
            }

            this.setState({loading:true})

            if (await InAppBrowser.isAvailable()) {
                const result = await InAppBrowser.open(formattedUrl, {
                    // Android Options
                    showTitle: true,
                    toolbarColor: '#000000',
                    secondaryToolbarColor: '#000000',
                    navigationBarColor: '#000000',
                    enableUrlBarHiding: true,
                    enableDefaultShare: true,
                    forceCloseOnRedirection: false,
                    animations: {
                        startEnter: 'slide_in_right',
                        startExit: 'slide_out_left',
                        endEnter: 'slide_in_left',
                        endExit: 'slide_out_right',
                    },
                });

                this.setState({loading:false})
                console.log('Browser closed with result:', result);
            } else {
                this.setState({loading:false})
                Alert.alert('Error', 'InAppBrowser not available');
            }
        } catch (error: Error) {
            this.setState({loading:false})
            Alert.alert('Error', `Could not open browser: ${error.message}`);
            console.error(error);
        }
    };

  render() {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: styles.container.backgroundColor },
        ]}
      >
        <View style={styles.statusBar}>
          <Text style={styles.statusBarText}>Porcupine</Text>
        </View>
        <View style={styles.keyword}>
          <Text style={styles.keywordText}>Keyword</Text>
        </View>
        <View style={styles.button}>
          <TouchableOpacity
            style={styles.buttonStyle}
            onPress={() => this._toggleListening()}
            disabled={this.state.buttonDisabled || this.state.isError}
          >
            <Text style={styles.buttonText}>{this.state.buttonText}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.button}>
          <TouchableOpacity
            style={styles.buttonStyle}
            onPress={() => this._playAudio()}
            disabled={false}
          >
            <Text style={styles.buttonText}>{this.state.playerButtonText}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.button}>
          <TouchableOpacity style={styles.buttonStyle} onPress={() => this.uploadFile()} disabled={false}>
            <Text style={styles.buttonText}>{this.state.uploadButtonText}</Text>
          </TouchableOpacity>
        </View>

          <View style={styles.button}>
              <TouchableOpacity style={styles.buttonStyle} onPress={() => this.commandOutput()} disabled={false}>
                  <Text style={styles.buttonText}>{this.state.commandButtonText}</Text>
              </TouchableOpacity>
          </View>
          <View style={styles.container}>
              <TextInput style={styles.textBox} value={commandText} placeholder="Type command" onChangeText={this.setCommandText}
                         onFocus={() => {/* Optionally handle command logic here */}}
              />
              <TouchableOpacity style={styles.micButton} onPressIn={this._startProcessing} onPressOut={this._stopProcessing}>
                  <Icon name="microphone" size={32} color="#fff" />
              </TouchableOpacity>
          </View>

          <View style={styles.button}>
              <TouchableOpacity
                  style={styles.buttonStyle}
                  onPress={() => this.nextLink()}
                  disabled={this.state.nextButtonDisabled}>
                  <Text style={styles.buttonText}>{this.state.nextLinkButtonText}</Text>
              </TouchableOpacity>
          </View>

        {this.state.isError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{this.state.errorMessage}</Text>
          </View>
        )}
        <View style={styles.footerView}>
          <Text style={styles.instructions}>
            Made in Vancouver, Canada by Picovoice
          </Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
    container: {flex: 1, flexDirection: 'column', justifyContent: 'center', backgroundColor: '#000000',},
    subContainer: {flex: 1, justifyContent: 'center',},
    statusBar: {flex: 0.4, backgroundColor: '#377DFF', justifyContent: 'flex-end',},
    statusBarText: {fontSize: 9, color: 'white', fontWeight: 'bold', marginLeft: 3, marginBottom: 3,},
    keyword: {flex: 1, paddingTop: '10%',},
    keywordText: {color: '#666666', marginLeft: 3, marginBottom: 5,},
    picker: {width: '90%', height: '40%', alignContent: 'center', justifyContent: 'center', alignSelf: 'center',},
    button: {flex: 1, justifyContent: 'flex-start', alignContent: 'center',},
    buttonStyle: {width: '15%', height: '15%', alignSelf: 'center', justifyContent: 'center', backgroundColor: '#377DFF', borderRadius: 10,},
    buttonText: {fontSize: 12, fontWeight: 'bold', color: 'white', textAlign: 'center',},
    itemStyle: {fontWeight: 'bold', fontSize: 9, textAlign: 'center', color: 'black',},
    footerView: {flex: 1, justifyContent: 'flex-end', paddingBottom: 25,},
    instructions: {textAlign: 'center', color: '#666666',},
    errorBox: {backgroundColor: 'red',  borderRadius: 5,  margin: 20,  padding: 20,  textAlign: 'center'},
    errorText: { color: 'white',  fontSize: 16,},
    micButton: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center', backgroundColor: 'red', borderRadius: 28 },
    textBox: { flex: 1, marginRight: 12, padding: 8, color: '#fff', backgroundColor: '#222', borderRadius: 4 },
});
