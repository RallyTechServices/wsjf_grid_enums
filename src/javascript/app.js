var Ext = window.Ext4 || window.Ext;
/* global _*/
/* global Rally */
Ext.define('com.ca.technicalservices.wsjf_named_weights', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    valueMap: {
        '1': 'Low',
        '2': 'Medium',
        '3': 'High'
    },
    fieldEditor: {
        xtype: 'combobox',
        store: [
            [1, 'Low'],
            [2, 'Medium'],
            [3, 'High']
        ]
    },
    defaultColumns: [],
    launch: function() {
        var that = this;

        that.TimeCriticalityField = that.getSetting('TimeCriticalityField');
        that.RROEValueField = that.getSetting('RROEValueField');
        that.UserBusinessValueField = that.getSetting('UserBusinessValueField');
        that.JobSizeField = that.getSetting('JobSizeField');

        that.TimeCriticalityFieldWeights = that._parseWeights(that.getSetting('TimeCriticalityFieldWeights'));
        that.RROEValueFieldWeights = that._parseWeights(that.getSetting('RROEValueFieldWeights'));
        that.UserBusinessValueFieldWeights = that._parseWeights(that.getSetting('UserBusinessValueFieldWeights'));
        that.JobSizeFieldWeights = that._parseWeights(that.getSetting('JobSizeFieldWeights'));

        that.WSJFScoreField = that.getSetting('WSJFScoreField');
        that.ShowValuesAfterDecimal = that.getSettingsFields('ShowValuesAfterDecimal');

        that._setDefaultColumns();

        this._grid = null;
        this._piCombobox = this.add({
            xtype: "rallyportfolioitemtypecombobox",
            padding: 5,
            listeners: {
                //ready: this._onPICombobox,
                select: this._onPICombobox,
                scope: this
            }
        });
    },

    _parseWeights: function(weightsString) {
        var result;
        if (weightsString) {
            result = _.map(weightsString.split(','), function(weight) {
                var nameValue = weight.split(':');
                var name = nameValue[0].trim();
                var weight = parseInt(nameValue[1]);
                return [weight, name]
            });
        }
        return result;
    },

    _buildRenderer: function(store) {
        return function(value) {
            var valueMap = _.find(store, function(map) {
                return value == map[0];
            });
            return valueMap ? valueMap[1] : "Unknown Value";
        }
    },

    _setDefaultColumns: function() {
        this.defaultColumns = [{
                text: 'Name',
                dataIndex: 'Name'
            },
            {
                text: 'Time Criticality',
                dataIndex: this.TimeCriticalityField,
                editor: {
                    xtype: 'combobox',
                    store: this.TimeCriticalityFieldWeights
                },
                renderer: this._buildRenderer(this.TimeCriticalityFieldWeights)
            },
            {
                text: 'RR/OE Value',
                dataIndex: this.RROEValueField,
                editor: {
                    xtype: 'combobox',
                    store: this.RROEValueFieldWeights
                },
                renderer: this._buildRenderer(this.RROEValueFieldWeights)
            },
            {
                text: 'User/Business Value',
                dataIndex: this.UserBusinessValueField,
                editor: {
                    xtype: 'combobox',
                    store: this.UserBusinessValueFieldWeights
                },
                renderer: this._buildRenderer(this.UserBusinessValueFieldWeights)
            },
            {
                text: 'Job Size',
                dataIndex: this.JobSizeField,
                editor: {
                    xtype: 'combobox',
                    store: this.JobSizeFieldWeights
                },
                renderer: this._buildRenderer(this.JobSizeFieldWeights)
            },
            {
                text: "WSJF Score",
                dataIndex: this.WSJFScoreField
            }
        ]
    },

    _onPICombobox: function() {
        var selectedType = this._piCombobox.getRecord();
        var model = selectedType.get('TypePath');

        if (this._grid !== null) {
            this._grid.destroy();
        }

        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: [model],
            listeners: {
                load: function(store) {
                    var records = store.getRootNode().childNodes;
                    this._calculateScore(records, true);
                },
                update: function(store, rec, modified, opts) {
                    this._calculateScore([rec], false);
                },
                scope: this
            },
            // autoLoad: true,
            enableHierarchy: true
        }).then({
            success: this._onStoreBuilt,
            scope: this
        });
    },

    _valueAsStringRenderer: function(value) {
        return this.valueMap[value];
    },

    _onStoreBuilt: function(store, records) {
        //var records = store.getRootNode().childNodes;
        var that = this;
        var selectedType = this._piCombobox.getRecord();
        var modelNames = selectedType.get('TypePath');

        var context = this.getContext();
        this._grid = this.add({
            xtype: 'rallygridboard',
            context: context,
            modelNames: [modelNames],
            toggleState: 'grid',
            stateful: false,
            plugins: [{
                    ptype: 'rallygridboardinlinefiltercontrol',
                    filterChildren: false,
                    inlineFilterButtonConfig: {
                        modelNames: [modelNames],
                        stateful: true,
                        stateId: context.getScopedStateId('custom-filter-example'),
                        inlineFilterPanelConfig: {
                            quickFilterPanelConfig: {
                                defaultFields: [
                                    'ArtifactSearch'
                                ],
                                addQuickFilterConfig: {
                                    whiteListFields: ['Milestones', 'Tags']
                                }
                            },
                            advancedFilterPanelConfig: {
                                advancedFilterRowsConfig: {
                                    propertyFieldConfig: {
                                        whiteListFields: ['Milestones', 'Tags']
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    ptype: 'rallygridboardfieldpicker',
                    headerPosition: 'left',
                    modelNames: [modelNames],
                    stateful: true,
                    stateId: context.getScopedStateId('columns-example')
                },
                {
                    ptype: 'rallygridboardactionsmenu',
                    menuItems: [{
                        text: 'Export...',
                        handler: function() {
                            window.location =
                                Rally.ui.gridboard.Export.buildCsvExportUrl(this.down('rallygridboard').getGridOrBoard());



                        },
                        scope: this
                    }],
                    buttonConfig: {
                        iconCls: 'icon-export'
                    }
                }
            ],
            gridConfig: {
                store: store,
                enabledEditing: true,
                alwaysShowDefaultColumns: true,
                /*
                columnCfgs: [
                    'Name',
                    that.TimeCriticalityField, that.RROEValueField, that.UserBusinessValueField, that.JobSizeField,
                    this.getSetting("useExecutiveMandateField") === true ? this.getSetting("ExecutiveMandateField") : null,
                    {
                        text: "WSJF Score",
                        dataIndex: that.WSJFScoreField,
                        editor: null
                    }
                ]
                */
                listeners: {
                    scope: that,
                    beforestaterestore: function(grid, state) {
                        // Restored columns are greatly simplified and do not persist all column options.
                        // If any of the restored columns share a name and data index with a default column,
                        // merge in the default column options (such as editor and renderer).
                        _.each(state.columns, function(column) {
                            var matchingDefaultColumn = _.find(this.defaultColumns, function(defaultColumn) {
                                // TODO (tj) It is possible that two columns with same Name collide. Can't use data index because
                                // the persisted value is the UUID
                                if (column.text == defaultColumn.text) {
                                    return true;
                                }
                            });
                            _.merge(column, matchingDefaultColumn);
                        }, that);
                    }
                },
                columnCfgs: this.defaultColumns
            },
            height: this.getHeight()
        });
    },

    _calculateScore: function(records, loading) {
        var that = this;

        Ext.Array.each(records, function(feature) {
            var execMandate = that.getSetting("useExecutiveMandateField") === true ? feature.data[that.getSetting("ExecutiveMandateField")] : 1;
            execMandate = _.isUndefined(execMandate) || _.isNull(execMandate) || execMandate === 0 ? 1 : execMandate;

            var jobSize = feature.data[that.JobSizeField];
            jobSize = _.isUndefined(jobSize) || _.isNull(jobSize) ? 0 : jobSize;

            var timeValue = feature.data[that.TimeCriticalityField];
            timeValue = _.isUndefined(timeValue) || _.isNull(timeValue) ? 0 : timeValue;

            var OERR = feature.data[that.RROEValueField];
            OERR = _.isUndefined(OERR) || _.isNull(OERR) ? 0 : OERR;

            var userValue = feature.data[that.UserBusinessValueField];
            userValue = _.isUndefined(userValue) || _.isNull(userValue) ? 0 : userValue;

            var oldScore = feature.data[that.WSJFScoreField];
            oldScore = _.isUndefined(oldScore) || _.isNull(oldScore) ? 0 : oldScore;

            var isChecked = that.getSetting("ShowValuesAfterDecimal");
            //console.log("jobSize: ", jobSize, "execMandate: ", execMandate, 
            //"timeValue: ", timeValue, "userValue", userValue, "oldScore", oldScore);

            if (jobSize > 0) { // jobSize is the denominator so make sure it's not 0
                var score;

                if (!isChecked) {
                    score = (((userValue + timeValue + OERR) * execMandate) / jobSize);
                    score = Math.round(score);
                }
                else {
                    score = Math.floor(((userValue + timeValue + OERR) * execMandate / jobSize) * 100) / 100;
                }
                //console.log(feature.data.Name," Calculated Score ", score, "Old Score: ", oldScore);
                if (oldScore !== score) { // only update if score changed
                    feature.set(that.WSJFScoreField, score);
                    if (loading) {
                        // This ensures that if this is the first time this item
                        // is loaded into the grid, the calculation will be 
                        // saved in the db.
                        feature.save();
                    }
                }
            }
        });
    },

    getSettingsFields: function() {
        var values = [{
                name: 'ShowValuesAfterDecimal',
                xtype: 'rallycheckboxfield',
                label: "Show Values After the Decimal",
                labelWidth: 200
            },
            {
                name: 'useExecutiveMandateField',
                xtype: 'rallycheckboxfield',
                label: "Use Custom Executive Mandate Field",
                labelWidth: 200
            },
            {
                name: 'ExecutiveMandateField',
                xtype: 'rallytextfield',
                label: "Executive Mandate Field",
                labelWidth: 200
            },
            {
                name: 'TimeCriticalityField',
                xtype: 'rallytextfield',
                label: "Time Criticality Field",
                labelWidth: 200
            },
            {
                name: 'TimeCriticalityFieldWeights',
                xtype: 'rallytextfield',
                label: "Time Criticality Field Weights",
                labelWidth: 200
            },
            {
                name: 'RROEValueField',
                xtype: 'rallytextfield',
                label: "RROEValue Field",
                labelWidth: 200
            },
            {
                name: 'RROEValueFieldWeights',
                xtype: 'rallytextfield',
                label: "RROEValue Field Weights",
                labelWidth: 200
            },
            {
                name: 'UserBusinessValueField',
                xtype: 'rallytextfield',
                label: "User Business Value Field",
                labelWidth: 200
            },
            {
                name: 'UserBusinessValueFieldWeights',
                xtype: 'rallytextfield',
                label: "User Business Value Field Weights",
                labelWidth: 200
            },
            {
                name: 'JobSizeField',
                xtype: 'rallytextfield',
                label: "Job Size Field",
                labelWidth: 200
            },
            {
                name: 'JobSizeFieldWeights',
                xtype: 'rallytextfield',
                label: "Job Size Field Weights",
                labelWidth: 200
            },
            {
                name: 'WSJFScoreField',
                xtype: 'rallytextfield',
                label: "WSJFScore Field",
                labelWidth: 200
            },
        ];

        return values;
    },

    config: {
        defaultSettings: {
            ShowValuesAfterDecimal: false,
            useExecutiveMandateField: false,
            ExecutiveMandateField: 'c_ExecutiveMandate',
            TimeCriticalityField: 'TimeCriticality',
            RROEValueField: 'RROEValue',
            UserBusinessValueField: 'UserBusinessValue',
            JobSizeField: 'JobSize',
            WSJFScoreField: 'WSJFScore',

            TimeCriticalityFieldWeights: 'Low:1, Medium:10, High:100',
            RROEValueFieldWeights: 'Low:1, Medium:10, High:100',
            UserBusinessValueFieldWeights: 'Low:1, Medium:10, High:100',
            JobSizeFieldWeights: 'Low:1, Medium:10, High:100',
        }
    }
});
