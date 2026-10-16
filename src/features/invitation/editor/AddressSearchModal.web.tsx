import { useEffect, useRef } from 'react';
import { Modal, View } from 'react-native';

import { parsePostcode, POSTCODE_SCRIPT, PostcodeData } from './address';
import { AddressSheet, AddressSearchProps } from './AddressSheet';

declare global {
  interface Window {
    daum?: { Postcode: new (opts: { oncomplete: (d: PostcodeData) => void; width: string; height: string }) => { embed: (el: HTMLElement) => void } };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript() {
  if (window.daum?.Postcode) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = POSTCODE_SCRIPT;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('POSTCODE_LOAD_FAILED'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** 웹: 다음 우편번호 서비스를 화면 안에 바로 펼친다 */
export function AddressSearchModal({ visible, onClose, onSelect }: AddressSearchProps) {
  const box = useRef<View>(null);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    loadScript()
      .then(() => {
        const el = box.current as unknown as HTMLElement | null;
        if (!alive || !el || !window.daum) return;
        el.innerHTML = '';
        new window.daum.Postcode({
          oncomplete: (d) => onSelect(parsePostcode(d)),
          width: '100%',
          height: '100%',
        }).embed(el);
      })
      .catch(() => alive && onClose(true));
    return () => {
      alive = false;
    };
  }, [visible, onSelect, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => onClose()}>
      <AddressSheet onClose={() => onClose()}>
        <View ref={box} style={{ flex: 1 }} />
      </AddressSheet>
    </Modal>
  );
}
