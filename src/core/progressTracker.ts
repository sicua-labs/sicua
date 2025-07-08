import ora from "ora";
import pc from "picocolors";
import { ProgressStep } from "../types";

export class ProgressTracker {
  private steps: ProgressStep[];
  private currentStep: number;
  private startTime: number;
  private spinner: ReturnType<typeof ora>;
  private isCompleted: boolean;

  constructor(stepDescriptions: string[]) {
    this.steps = stepDescriptions.map((description) => ({
      description,
      completed: false,
      startTime: 0,
      duration: 0,
    }));
    this.currentStep = 0;
    this.startTime = 0;
    this.spinner = ora({
      text: "Starting analysis...",
      color: "cyan",
    });
    this.isCompleted = false;
  }

  private getProgressBar(percentage: number): string {
    const width = 30;
    const filledWidth = Math.round((percentage / 100) * width);
    const emptyWidth = width - filledWidth;
    return pc.cyan("█".repeat(filledWidth)) + pc.gray("░".repeat(emptyWidth));
  }

  private updateSpinnerText(): void {
    if (this.isCompleted) return;

    const completedSteps = Math.min(this.currentStep, this.steps.length);
    const percentage = Math.round((completedSteps / this.steps.length) * 100);

    if (this.currentStep < this.steps.length) {
      const progressBar = `[${this.getProgressBar(percentage)}] ${percentage}%`;
      const currentStepDescription = this.steps[this.currentStep].description;
      this.spinner.text = `${progressBar} - ${currentStepDescription}`;
    }
  }

  start(): void {
    if (this.isCompleted) return;

    console.log(pc.cyan(pc.bold("🚀 Analysis in Progress")));

    this.startTime = Date.now();
    this.steps[0].startTime = Date.now();

    this.updateSpinnerText();
    this.spinner.start();
  }

  incrementProgress(): void {
    if (this.isCompleted || this.currentStep >= this.steps.length) return;

    // Complete current step
    this.steps[this.currentStep].completed = true;
    this.steps[this.currentStep].duration =
      Date.now() - this.steps[this.currentStep].startTime;

    const completedStep = this.steps[this.currentStep];
    const duration = (completedStep.duration / 1000).toFixed(2);

    // Log the completed step above the spinner
    this.spinner.stop();
    console.log(
      pc.green(`✓ ${completedStep.description} ${pc.gray(`(${duration}s)`)}`)
    );

    this.currentStep++;

    // Start next step if available
    if (this.currentStep < this.steps.length) {
      this.steps[this.currentStep].startTime = Date.now();
      this.updateSpinnerText();
      this.spinner.start();
    } else {
      this.complete();
    }
  }

  complete(): void {
    if (this.isCompleted) return;

    // Complete any remaining steps
    while (this.currentStep < this.steps.length) {
      this.steps[this.currentStep].completed = true;
      this.steps[this.currentStep].duration =
        Date.now() - (this.steps[this.currentStep].startTime || this.startTime);

      const completedStep = this.steps[this.currentStep];
      const duration = (completedStep.duration / 1000).toFixed(2);

      console.log(
        pc.green(`✓ ${completedStep.description} ${pc.gray(`(${duration}s)`)}`)
      );

      this.currentStep++;
    }

    this.spinner.stop();

    const totalDuration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log(
      pc.green(pc.bold(`✨ Analysis completed in ${totalDuration}s. Results saved to analysis-results.json`))
    );

    this.isCompleted = true;
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  getTotalSteps(): number {
    return this.steps.length;
  }

  getSteps(): ProgressStep[] {
    return this.steps;
  }
}
