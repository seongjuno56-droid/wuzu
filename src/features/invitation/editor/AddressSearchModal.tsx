import { Modal } from 'react-native';
import { WebView } from 'react-native-webview';

import { parsePostcode, POSTCODE_SCRIPT } from './address';
import { AddressSheet, AddressSearchProps } from './AddressSheet';

const HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body,#wrap{margin:0;width:100%;height:100%}</style>
<script src="${POSTCODE_SCRIPT}"></script></head>
<body><div id="wrap"></div><script>
new daum.Postcode({
  oncomplete: function (d) { window.ReactNativeWebView.postMessage(JSON.stringify(d)); },
  width: '100%', height: '100%'
}).embed(document.getElementById('wrap'));
</script></body></html>`;

/** 앱: 다음 우편번호 서비스를 웹뷰로 띄운다 */
export function AddressSearchModal({ visible, onClose, onSelect }: AddressSearchProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => onClose()}>
      <AddressSheet onClose={() => onClose()}>
        <WebView
          originWhitelist={['*']}
          source={{ html: HTML, baseUrl: 'https://wuzu.app' }}
          onMessage={(e) => onSelect(parsePostcode(JSON.parse(e.nativeEvent.data)))}
          onError={() => onClose(true)}
        />
      </AddressSheet>
    </Modal>
  );
}
