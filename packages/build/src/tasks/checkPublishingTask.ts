import { TaskFunction, logger } from 'just-task';
import { getPackageInfos, findGitRoot } from 'workspace-tools';

export type DependencyType = 'dependencies' | 'devDependencies' | 'peerDependencies';

export interface CheckPublishingOptions {
  /**
   * An array of fields to check for private internal dependencies, by default this is just dependencies
   */
  dependencyTypes?: DependencyType[];
}

/**
 * Task to check the matrix of packages for publishing errors. In particular this checks for published packages that
 * have a dependency on a private package
 *
 * @param options - options for configuring the task
 */
export function checkPublishingTask(options: CheckPublishingOptions = {}): TaskFunction {
  const dependencyTypes = options.dependencyTypes || ['dependencies'];
  return function(done: (error?: Error) => void) {
    const packageInfos = getPackageInfos(findGitRoot(process.cwd()));
    logger.info('Starting scan for publishing errors');
    try {
      Object.keys(packageInfos).forEach(pkg => {
        if (!packageInfos[pkg].private) {
          logger.verbose(`Scanning published package ${pkg} for private dependenies`);
          dependencyTypes.forEach(dependencyType => {
            const deps = packageInfos[pkg][dependencyType];
            Object.keys(deps || {}).forEach(dep => {
              if (packageInfos[dep] && packageInfos[dep].private) {
                const errorMsg = `${pkg} has a ${dependencyType} on private package ${dep}`;
                logger.error(errorMsg);
                throw errorMsg;
              }
            });
          });
        }
      });
    } catch (err) {
      done(err);
    }
    logger.info('No publishing errors found');
    done();
  };
}
