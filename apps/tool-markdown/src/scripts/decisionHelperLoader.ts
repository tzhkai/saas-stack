export type DecisionHelperModule = Readonly<{
  autoMountMarkdownDecisionHelper: () => void;
  trackDecisionHelperVisible: () => void;
}>;

export type DecisionHelperImporter = () => Promise<DecisionHelperModule>;

export type DecisionHelperLoader = Readonly<{
  load: () => Promise<void>;
  destroy: () => void;
}>;

/**
 * Defers a long-form article widget until it is near the viewport. The article
 * remains fully readable without JavaScript; the caller is responsible for a
 * visible noscript path. No user data is read or stored by this loader.
 */
export function mountDeferredDecisionHelper(
  root: HTMLElement,
  importer: DecisionHelperImporter,
  rootMargin = '800px 0px',
): DecisionHelperLoader {
  let loaded = false;
  let modulePromise: Promise<DecisionHelperModule> | null = null;
  let mounting: Promise<void> | null = null;
  let observer: IntersectionObserver | null = null;
  let visibilityObserver: IntersectionObserver | null = null;
  let visibleTracked = false;

  const importModule = (): Promise<DecisionHelperModule> => {
    if (!modulePromise) {
      modulePromise = importer().catch((error) => {
        modulePromise = null;
        throw error;
      });
    }
    return modulePromise;
  };

  const load = (): Promise<void> => {
    if (loaded) return Promise.resolve();
    if (!mounting) {
      mounting = importModule().then((module) => {
        if (!loaded) {
          module.autoMountMarkdownDecisionHelper();
          loaded = true;
        }
      }).catch(() => {
        // Keep the static article and its noscript CTA usable if a chunk fails.
        mounting = null;
      });
    }
    return mounting;
  };

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer?.disconnect();
        observer = null;
        void load();
      }
    }, { rootMargin });
    observer.observe(root);
  } else {
    void load();
  }

  if ('IntersectionObserver' in window) {
    visibilityObserver = new IntersectionObserver((entries) => {
      if (!visibleTracked && entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) {
        visibleTracked = true;
        visibilityObserver?.disconnect();
        visibilityObserver = null;
        void load().then(() => importModule().then((module) => module.trackDecisionHelperVisible())).catch(() => undefined);
      }
    }, { threshold: 0.5 });
    visibilityObserver.observe(root);
  }

  return Object.freeze({
    load,
    destroy: () => { observer?.disconnect(); visibilityObserver?.disconnect(); },
  });
}
