const enabled = "enabled";

class Feature {
	constructor(private name: string) { }

	public isEnabled(): boolean {
		if (!global.window) {
			return false;
		}
		return localStorage[this.name] === enabled;
	}

	public enable(): void {
		localStorage[this.name] = enabled;
	}

	public disable(): void {
		delete localStorage[this.name];
	}
}

export const Features = {
	codeLens: new Feature("code-lens"),
	externalReferences: new Feature("external-references"),
	langPHP: new Feature("lang-php"),
	langPython: new Feature("lang-python"),
	googleCloudPlatform: new Feature("google-cloud-platform"),

	eventLogDebug: new Feature("event-log-debug"),
	actionLogDebug: new Feature("action-log-debug"),
};

if (global.window) {
	(window as any).features = Features;
}
