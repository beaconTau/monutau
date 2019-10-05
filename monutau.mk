###############################################
#  monutau 
#
#  That's right, monutau is largely implemented in make. Sorry, it seemed like it'd be a
#  good idea, but it's probably an illegible mess. 
#
#  Cosmin Deaconu <cozzyd@kicp.uchicago.edu>
#     
#

## Define what you need for your site in site.cfg


.PHONY: all sync clean rootify-event rootify-hk rootify-header rootify-status decimated-status

all: deploy 


### Pretty error message if you don't have site 
site.cfg: 
	$(error "You must copy (or symlink) a site.cfg into this directory!") 

include site.cfg

clean: 
	rm -f sync *.d rootify 


### Copy over new files 
sync: | $(RAW_DIR) 
ifdef REMOTE_HOST
	date >> $@ 
	-ssh -Ax -t midway "cd beacon/monutau; rsync --prune-empty-dirs --exclude=".*" -av $(RSYNC_OPTS) $(REMOTE_HOST):$(REMOTE_PATH_BASE)/ $(RAW_DIR)/ > last_sync"
#	rsync --prune-empty-dirs --exclude=".*" -av $(RSYNC_OPTS) $(REMOTE_HOST):$(REMOTE_PATH_BASE)/ $(RAW_DIR)/ >last_sync 
	sleep 1
	cat last_sync >> $@ 
	./do_touch.sh $(RAW_DIR) > do_touch
else
	echo "No need to sync" 
endif

ifndef MAKE_RESTARTS
# This enumerates the necessary ROOT files 
rootify.d: sync | $(ROOT_DIR) 
	echo "# Automatically generated file. Dont' touch. " > $@
	echo -n "rootify-event: " >> $@
	find $(RAW_DIR) -type d -name event -printf '$(ROOT_DIR)/%P.root ' >> $@
	echo >> $@
	echo -n "rootify-status: " >> $@
	find $(RAW_DIR) -type d -name status -printf '$(ROOT_DIR)/%P.root ' >> $@
	find $(RAW_DIR) -type d -name status -printf '$(ROOT_DIR)/%P.decimated.root ' >> $@
	echo >> $@
	echo -n "rootify-header: " >> $@
	find $(RAW_DIR) -type d  -name header -printf '$(ROOT_DIR)/%P.root ' >> $@
	echo >> $@
	echo -n "rootify-hk: " >> $@ 
	find $(RAW_DIR)/hk -mindepth 3 -type d -printf '$(ROOT_DIR)/hk/%P.root ' >> $@
	echo >> $@
endif



## Directories
$(RAW_DIR): 
	mkdir -p $@
$(RAW_DIR)/hk: 
	mkdir -p $@
$(ROOT_DIR): 
	mkdir -p $@
$(HTML_DIR): 
	mkdir -p $@




#special case hk 
$(ROOT_DIR)/hk/%.root: $(RAW_DIR)/hk/%
	mkdir -p $(@D)
	beaconroot-convert hk $< $@.tmp
	mv $@.tmp $@ 
	touch new_hk 


# Crazy rule to rootify root file from raw dir
$(ROOT_DIR)/%.root: $(RAW_DIR)/%
	mkdir -p $(@D)
	beaconroot-convert $(*F) $< $@.tmp
	mv $@.tmp $@ 
	


# Rule to make decimated file 
$(ROOT_DIR)/%.decimated.root: $(ROOT_DIR)/%.root
	ln -f $< $<.tmp 
	beaconroot-decimate $(*F) 25 $(@D)/$(*F).root.tmp 
	unlink $<.tmp 
	mv $@.tmp $@ 


rootify: rootify.d rootify-event rootify-status rootify-header rootify-hk 
	touch $@ 

##TODO 

html/runs: rootify
	find $(ROOT_DIR) -type d -name run* -printf '  %f\n' | sed 's/run//' | sort -n  | paste -s -d ',' > $@ 

html/runlist.js: html/runs
	echo "var runs = [ " > $@ 
	cat  $< >> $@
	echo "];" >> $@
	echo "var last_updated = \"`date -u`\";" >> $@ 

html/runlist.json: html/runs
	echo "{ \"runs\" : [" > $@
	sed -e 's/,^//g'  $< >> $@
	echo "]," >> $@
	echo "\"last_updated\" : \"`date -u`\"" >> $@ 
	echo "}" >> $@

$(HTML_DIR)/% : html/% 
	cp  $< $@

new_hk: 
	touch $@

# Merge all housekeeping into a single root file since it's small 
$(HTML_DIR)/all_hk.root: new_hk  | $(HTML_DIR) rootify
	hadd  -f $@.tmp $(ROOT_DIR)/hk/*/*/*.root
	mv $@.tmp $@


$(HTML_DIR)/rootdata: site.cfg | $(HTML_DIR) 
	ln -sf $(ROOT_DIR) $(HTML_DIR)/rootdata 

$(HTML_DIR)/jsroot: jsroot/scripts jsroot/style
	mkdir -p $@
	cp -r $^ $@


deploy:  rootify $(HTML_DIR)/rootdata $(HTML_DIR)/index.html $(HTML_DIR)/monutau.js $(HTML_DIR)/rf.js  $(HTML_DIR)/runlist.js $(HTML_DIR)/runlist.json  $(HTML_DIR)/all_hk.root $(HTML_DIR)/jsroot $(HTML_DIR)/monutau.ico $(HTML_DIR)/monutau.png $(HTML_DIR)/KissFFT.js $(HTML_DIR)/FFT.js | $(HTML_DIR) 
	touch $@ 


include rootify.d





