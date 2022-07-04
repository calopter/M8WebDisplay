export class RTCConnection {
  _parser;
  _onConnectionChanged;
  _connection;
  _dataChannel;
  
  constructor(parser, onConnectionChanged) {
    this._parser = parser;
    this._onConnectionChanged = onConnectionChanged;
    this._connection = new RTCPeerConnection();
  }

  handleMessage(e) {
    console.log('message received:', e.data);
    this._parser.process(e.data);
  }

  async createOffer() {
    const offer = await this._connection.createOffer();
    this._connection.setLocalDescription(offer);
  }

  async initializeConnection() {
    this._dataChannel = this._connection.createDataChannel('channel');
    this._dataChannel.onmessage = this.handleMessage;
    this._dataChannel.onopen = () => {
      console.log('connection opened from remote answer');
      this._dataChannel.send('hello world');
    }

    await this.createOffer();

    this.registerIceGatheredHandler();
  }

  registerIceGatheredHandler() {
    this._connection.onicegatheringstatechange = e => {
      if (e.target.iceGatheringState === 'complete') {
        this.signal(this._connection.localDescription);

        // this is also signalling?
        const answer = prompt('answer');
        this._connection.setRemoteDescription(JSON.parse(answer));
      }
    }
  }

  registerDataChannelHandler() {
    this._connection.ondatachannel = e => {
      const remoteChannel = e.channel;
      remoteChannel.onmessage = e => {
        this.handleMessage(e);
        remoteChannel.send('world hello');
      };
      remoteChannel.onopen = () => console.log('connection opened from remote offer');

      this._dataChannel = remoteChannel;
    }
  }

  async handleRemoteOffer(remoteOffer) {
    console.log('received remote offer');
    await this._connection.setRemoteDescription(JSON.parse(remoteOffer));

    this.registerDataChannelHandler();

    const answer = await this._connection.createAnswer();
    this._connection.setLocalDescription(answer);

    this.signal(answer);
  }

  signal(sdp) {
    console.log(sdp.type);
    console.log(JSON.stringify(sdp));
  }

  async _send(msg) {
    if (!this._dataChannel || !this._dataChannel.send) return;

    try {
      await this._dataChannel.send(msg);
    } catch (err) {
      console.error(err);
      this.disconnect();
    }
  }

  async _reset() {
    await this._send([0x44]);
    await wait(50);
    this._parser.reset();
    await this._send([0x45, 0x52]);
  }

  async connect(autoConnecting = true) {
    const remoteOffer = prompt('remote offer');

    remoteOffer ? (await this.handleRemoteOffer(remoteOffer)) : (await this.initializeConnection());

    await this._reset();

    this._onConnectionChanged(true);
  }

  async disconnect() {
    this._connection.close();
    this._onConnectionChanged(false);
  }

  get isConnected() {
    const { connectionState } = this._connection || {};
    return connectionState === 'connected';
  }

  async sendKeys(state) {
    this._send([0x43, state]);
  }

  async sendNoteOn(note, vel) {
    this._send([0x4B, note, vel]);
  }

  async sendNoteOff() {
    this._send([0x4B, 255]);
  }
}
