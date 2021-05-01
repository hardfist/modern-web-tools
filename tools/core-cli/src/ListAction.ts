import { Octokit } from '@octokit/rest';
import { CommandLineAction } from '@rushstack/ts-command-line';

export class ListAction extends CommandLineAction {
  octokit: Octokit;
  public constructor() {
    super({
      actionName: 'list',
      summary: 'list  github repo',
      documentation: 'list your github repo'
    });
    this.octokit = new Octokit();
  }
  protected onDefineParameters(): void {}
  protected async onExecute(): Promise<void> {
    const { data: list } = await this.octokit.rest.repos.listForUser({ username: 'hardfist' });
    for (const item of list) {
      if (!item.fork) {
        console.log('item:', item.clone_url);
      }
      this.octokit.repos.delete({});
    }
  }
}
