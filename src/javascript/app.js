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
    launch: function() {
        var that = this;

        //console.log(that.getSettings());
        that.TimeCriticalityField = that.getSetting('TimeCriticalityField');
        that.RROEValueField = that.getSetting('RROEValueField');
        that.UserBusinessValueField = that.getSetting('UserBusinessValueField');
        that.WSJFScoreField = that.getSetting('WSJFScoreField');
        that.JobSizeField = that.getSetting('JobSizeField');
        that.ShowValuesAfterDecimal = that.getSettingsFields('ShowValuesAfterDecimal');

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

    _onPICombobox: function() {
        var selectedType = this._piCombobox.getRecord();
        var model = selectedType.get('TypePath');

        if (this._grid !== null) {
            this._grid.destroy();
        }

        var store = Ext.create('Rally.data.wsapi.Store', {
            model: model,
            listeners: {
                load: function(store, data) {
                    this._calculateScore(data, true);
                },
                update: function(store, rec, modified, opts) {
                    this._calculateScore([rec], false);
                },
                scope: this
            },
            autoLoad: true
        });
        this._onStoreBuilt(store);
    },

    _valueAsStringRenderer: function(value) {
        return this.valueMap[value];
    },

    _onStoreBuilt: function(store) {
        var that = this;

        var context = this.getContext();
        this._grid = this.add({
            xtype: 'rallygrid',
            context: context,
            stateful: false,
            store: store,
            enableEditing: true,
            columnCfgs: [{
                    text: 'Name',
                    dataIndex: 'Name'
                },
                {
                    text: 'Time Criticality',
                    dataIndex: that.TimeCriticalityField,
                    editor: this.fieldEditor,
                    renderer: this._valueAsStringRenderer.bind(this)
                },
                {
                    text: 'RR/OE Value',
                    dataIndex: that.RROEValueField,
                    editor: this.fieldEditor,
                    renderer: this._valueAsStringRenderer.bind(this)
                },
                {
                    text: 'User/Business Value',
                    dataIndex: that.UserBusinessValueField,
                    editor: this.fieldEditor,
                    renderer: this._valueAsStringRenderer.bind(this)
                },
                {
                    text: 'Job Size',
                    dataIndex: that.JobSizeField,
                    editor: this.fieldEditor,
                    renderer: this._valueAsStringRenderer.bind(this)
                },
                {
                    text: "WSJF Score",
                    dataIndex: that.WSJFScoreField
                }
            ],
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
                name: 'RROEValueField',
                xtype: 'rallytextfield',
                label: "RROEValue Field",
                labelWidth: 200
            },
            {
                name: 'UserBusinessValueField',
                xtype: 'rallytextfield',
                label: "User Business Value Field",
                labelWidth: 200
            },
            {
                name: 'WSJFScoreField',
                xtype: 'rallytextfield',
                label: "WSJFScore Field",
                labelWidth: 200
            },
            {
                name: 'JobSizeField',
                xtype: 'rallytextfield',
                label: "Job Size Field",
                labelWidth: 200
            }
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
            WSJFScoreField: 'WSJFScore',
            JobSizeField: 'JobSize'
        }
    }
});
