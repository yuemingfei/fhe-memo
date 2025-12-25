import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEMemo = await deploy("FHEMemo", {
    from: deployer,
    log: true,
  });

  console.log(`FHEMemo contract deployed at: `, deployedFHEMemo.address);
};
export default func;
func.id = "deploy_fheMemo";
func.tags = ["FHEMemo"];
