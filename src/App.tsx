/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { ServiceSuite } from './components/ServiceSuite';

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-white font-sans">
      <div className="w-full overflow-y-auto">
        <ServiceSuite />
      </div>
    </div>
  );
}
