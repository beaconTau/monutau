#! /bin/bash

### monutau.sbatch
### Monutau slurm job. 

### Cosmin Deaconu <cozzyd@kicp.uchicago.edu> 



#Slurm stuff  (ignore if not using slurm) 

#SBATCH --job-name=monutau 
#SBATCH --output=monutau.out
#SBATCH --error=monutau.err
#SBATCH --time=1:00:00
#SBATCH --partition=kicpaa
#SBATCH --account=kicpaa
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=1


## Check MONUTAU_DIR and switch to that that if it's defined

if [ -n "$MONUTAU_DIR" ]; then
  cd "$MONUTAU_DIR"; 
fi;

cd ../;
. env.sh 
cd - 

make 







        
        



    
















