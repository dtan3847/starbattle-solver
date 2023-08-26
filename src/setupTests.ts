// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

type AnyFunction = (...args: any[]) => any
const noop = () => {}
class MockWorker {
    onmessage: AnyFunction = noop
    onmessageerror: AnyFunction = noop
    onerror: AnyFunction = noop
    postMessage: AnyFunction = noop
    terminate: AnyFunction = noop
    addEventListener: AnyFunction = noop
    removeEventListener: AnyFunction = noop
    dispatchEvent: AnyFunction = noop
}
window.Worker = MockWorker;