import { CommandLineFlagParameter, CommandLineParser } from '@rushstack/ts-command-line';
import { ListAction } from './ListAction';

export class CoreCommandLine extends CommandLineParser {
  public constructor() {
    super({
      toolFilename: 'core',
      toolDescription: 'this is modern-web-tools core command line'
    });
    this.addAction(new ListAction());
  }
  private _verbose!: CommandLineFlagParameter;
  protected onDefineParameters(): void {
    this._verbose = this.defineFlagParameter({
      parameterLongName: '--verbose',
      parameterShortName: '-v',
      description: 'show extra logging detail'
    });
  }
  async onExecute() {
    return super.onExecute();
  }
}
