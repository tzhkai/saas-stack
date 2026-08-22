import assert from 'node:assert/strict';
import test from 'node:test';
import { mountDeferredDecisionHelper } from '../src/scripts/decisionHelperLoader';

type FakeEntry = Readonly<{ isIntersecting: boolean; intersectionRatio: number }>;

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  readonly callback: IntersectionObserverCallback;
  disconnected = false;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }

  observe(): void {}

  disconnect(): void {
    this.disconnected = true;
  }

  trigger(entries: readonly FakeEntry[]): void {
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
  }
}

test('shares one dynamic import while mounting once and tracking 50% visibility once', async () => {
  const originalWindow = globalThis.window;
  const originalIntersectionObserver = globalThis.IntersectionObserver;
  FakeIntersectionObserver.instances = [];
  Object.assign(globalThis, {
    window: globalThis,
    IntersectionObserver: FakeIntersectionObserver,
  });

  try {
    let imports = 0;
    let mounts = 0;
    let visibleEvents = 0;
    const loader = mountDeferredDecisionHelper({} as HTMLElement, async () => {
      imports += 1;
      return {
        autoMountMarkdownDecisionHelper: () => { mounts += 1; },
        trackDecisionHelperVisible: () => { visibleEvents += 1; },
      };
    });

    assert.equal(FakeIntersectionObserver.instances.length, 2);
    const [nearViewport, halfVisible] = FakeIntersectionObserver.instances;

    nearViewport.trigger([{ isIntersecting: true, intersectionRatio: 0.01 }]);
    await loader.load();
    assert.equal(imports, 1);
    assert.equal(mounts, 1);
    assert.equal(visibleEvents, 0);

    halfVisible.trigger([{ isIntersecting: true, intersectionRatio: 0.5 }]);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(imports, 1);
    assert.equal(mounts, 1);
    assert.equal(visibleEvents, 1);

    halfVisible.trigger([{ isIntersecting: true, intersectionRatio: 1 }]);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(visibleEvents, 1);
    assert.equal(nearViewport.disconnected, true);
    assert.equal(halfVisible.disconnected, true);
  } finally {
    Object.assign(globalThis, {
      window: originalWindow,
      IntersectionObserver: originalIntersectionObserver,
    });
  }
});
