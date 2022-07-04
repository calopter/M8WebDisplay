export class RTCConnection {
  _parser;
  _onConnectionChanged;
  
  constructor(parser, onConnectionChanged) {
    this._parser = parser;
    this._onConnectionChanged = onConnectionChanged;
  }

  sendNoteOff() {
  }

  async connect(autoConnecting = true) {
    const connection = new RTCPeerConnection();

    const remoteOffer = prompt('remote offer');
    if (!remoteOffer) {
      const dataChannel = connection.createDataChannel('channel');
      dataChannel.onmessage = e => console.log('message received:', e.data);
      dataChannel.onopen = () => {
        console.log('connection opened from remote answer');
        dataChannel.send('hello world');
      }

      const offer = await connection.createOffer();
      connection.setLocalDescription(offer);

      connection.onicegatheringstatechange = async e => {
        if (e.target.iceGatheringState === 'complete') {
          console.log('offer');
          console.log(JSON.stringify(connection.localDescription));

          const answer = prompt('answer');

          if (answer) {
            await connection.setRemoteDescription(JSON.parse(answer));
          }
        }
      }
    } else {
      console.log('got remote offer');
      await connection.setRemoteDescription(JSON.parse(remoteOffer));

      connection.ondatachannel = e => {
        const remoteChannel = e.channel;
        remoteChannel.onmessage = e => {
          console.log('messaged received:', e.data);
          remoteChannel.send('world hello');
        };
        remoteChannel.onopen = () => console.log('connection opened from remote offer');
      }

      const answer = await connection.createAnswer();
      connection.setLocalDescription(answer);
      console.log('answer');
      console.log(JSON.stringify(answer));
    }
  }

  async disconnect() {
  }
}
