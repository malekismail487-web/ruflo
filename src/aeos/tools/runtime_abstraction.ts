/**
 * AEOS Runtime Abstraction Layer
 * Seamlessly switches between Mode A (Interactive O3DE Editor) and Mode B (Headless Automation).
 */

export enum RuntimeMode {
  INTERACTIVE_EDITOR = 'INTERACTIVE_EDITOR',
  HEADLESS_AUTOMATION = 'HEADLESS_AUTOMATION'
}

export interface ExecutionContext {
  mode: RuntimeMode;
  editorSessionActive: boolean;
  enableViewportRendering: boolean;
  profilerFrequencyHz: number;
  outputArtifactDirectory: string;
}

export class RuntimeEnvironmentManager {
  private static instance: RuntimeEnvironmentManager;
  private currentContext: ExecutionContext;

  private constructor() {
    this.currentContext = {
      mode: RuntimeMode.HEADLESS_AUTOMATION,
      editorSessionActive: false,
      enableViewportRendering: true,
      profilerFrequencyHz: 60,
      outputArtifactDirectory: './artifacts/aeos_output'
    };
  }

  public static getInstance(): RuntimeEnvironmentManager {
    if (!RuntimeEnvironmentManager.instance) {
      RuntimeEnvironmentManager.instance = new RuntimeEnvironmentManager();
    }
    return RuntimeEnvironmentManager.instance;
  }

  public setMode(mode: RuntimeMode): void {
    this.currentContext.mode = mode;
    this.currentContext.editorSessionActive = (mode === RuntimeMode.INTERACTIVE_EDITOR);
  }

  public getContext(): ExecutionContext {
    return { ...this.currentContext };
  }

  public isHeadless(): boolean {
    return this.currentContext.mode === RuntimeMode.HEADLESS_AUTOMATION;
  }
}
